import { compare } from "bcryptjs";
import { redirect } from "next/navigation";

import { destroyCurrentSession, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAccountSchema, sanitizeInternalRedirect } from "@/lib/validation";

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
    redirect("/signin?next=/settings");
  }

  const formData = await request.formData();
  const redirectTo = sanitizeInternalRedirect(formData.get("redirectTo")?.toString(), "/settings");
  const parsed = deleteAccountSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    confirmText: formData.get("confirmText"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Type DELETE and enter your current password to continue.",
      }),
    );
  }

  const account = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!account) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Account not found.",
      }),
    );
  }

  const passwordMatches = await compare(parsed.data.currentPassword, account.passwordHash);
  if (!passwordMatches) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Current password is incorrect.",
      }),
    );
  }

  await prisma.user.delete({
    where: {
      id: account.id,
    },
  });

  await destroyCurrentSession();
  redirect("/?notice=Account deleted permanently.");
}
