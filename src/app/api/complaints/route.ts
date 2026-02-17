import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeInternalRedirect } from "@/lib/validation";

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
