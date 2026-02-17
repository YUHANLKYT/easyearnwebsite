import { compare } from "bcryptjs";
import { redirect } from "next/navigation";

import { createUserSession } from "@/lib/auth";
import { ensureDefaultAdminAccount } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sanitizeInternalRedirect } from "@/lib/validation";

function buildRedirect(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `/admin/signin?${query}` : "/admin/signin";
}

export async function POST(request: Request) {
  await ensureDefaultAdminAccount();

  const formData = await request.formData();
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const nextPath = sanitizeInternalRedirect(formData.get("next")?.toString(), "/admin");

  if (!email || !password) {
    redirect(
      buildRedirect({
        error: "Enter admin email and password.",
        next: nextPath,
      }),
    );
  }

  const adminUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      role: true,
      status: true,
      passwordHash: true,
    },
  });

  if (!adminUser || adminUser.role !== "ADMIN") {
    redirect(
      buildRedirect({
        error: "Admin account not found.",
        next: nextPath,
      }),
    );
  }

  const validPassword = await compare(password, adminUser.passwordHash);
  if (!validPassword) {
    redirect(
      buildRedirect({
        error: "Invalid admin credentials.",
        next: nextPath,
      }),
    );
  }

  if (adminUser.status !== "ACTIVE") {
    redirect(
      buildRedirect({
        error: "Admin account is not active.",
        next: nextPath,
      }),
    );
  }

  await createUserSession(adminUser.id);
  redirect(nextPath);
}
