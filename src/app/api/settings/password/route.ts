import { compare, hash } from "bcryptjs";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema, sanitizeInternalRedirect } from "@/lib/validation";

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
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Please enter passwords correctly.",
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

  const currentMatches = await compare(parsed.data.currentPassword, account.passwordHash);
  if (!currentMatches) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Current password is incorrect.",
      }),
    );
  }

  const nextPasswordHash = await hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: {
      id: account.id,
    },
    data: {
      passwordHash: nextPasswordHash,
    },
  });

  redirect(
    buildRedirect(redirectTo, {
      notice: "Password updated successfully.",
    }),
  );
}
