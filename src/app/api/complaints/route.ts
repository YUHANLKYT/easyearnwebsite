import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeInternalRedirect } from "@/lib/validation";

const COMPLAINT_COOLDOWN_HOURS = 3;
const COMPLAINT_COOLDOWN_MS = COMPLAINT_COOLDOWN_HOURS * 60 * 60 * 1000;

function buildRedirect(path: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function formatRemainingCooldown(until: Date, now: Date) {
  const remainingMs = Math.max(0, until.getTime() - now.getTime());
  const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin?next=/dashboard");
  }

  const formData = await request.formData();
  const subject = formData.get("subject")?.toString().trim() ?? "";
  const message = formData.get("message")?.toString().trim() ?? "";
  const redirectTo = sanitizeInternalRedirect(formData.get("redirectTo")?.toString(), "/dashboard");

  if (user.status !== "ACTIVE") {
    redirect(
      buildRedirect(redirectTo, {
        error: "Muted or terminated accounts cannot submit complaints.",
      }),
    );
  }

  if (subject.length < 4 || message.length < 8) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Please provide a clear subject and complaint message.",
      }),
    );
  }

  const now = new Date();
  const latestComplaint = await prisma.complaint.findFirst({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
    },
  });

  if (latestComplaint) {
    const nextAllowedAt = new Date(latestComplaint.createdAt.getTime() + COMPLAINT_COOLDOWN_MS);
    if (nextAllowedAt > now) {
      redirect(
        buildRedirect(redirectTo, {
          error: `You can submit a new complaint every ${COMPLAINT_COOLDOWN_HOURS} hours. Try again in ${formatRemainingCooldown(
            nextAllowedAt,
            now,
          )}.`,
        }),
      );
    }
  }

  await prisma.complaint.create({
    data: {
      userId: user.id,
      subject: subject.slice(0, 100),
      message: message.slice(0, 1200),
      status: "OPEN",
    },
  });

  redirect(
    buildRedirect(redirectTo, {
      notice: "Complaint submitted. Our admin team will review it.",
    }),
  );
}
