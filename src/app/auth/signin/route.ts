import { compare } from "bcryptjs";
import { redirect } from "next/navigation";

import { createUserSession } from "@/lib/auth";
import { ensureDefaultAdminAccount } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sanitizeInternalRedirect, signInSchema } from "@/lib/validation";

function buildSigninRedirect(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `/signin?${query}` : "/signin";
}

export async function POST(request: Request) {
  await ensureDefaultAdminAccount();

  const formData = await request.formData();
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  const fallbackNext = sanitizeInternalRedirect(formData.get("next")?.toString(), "/dashboard");

  if (!parsed.success) {
    redirect(
      buildSigninRedirect({
        error: "Please enter a valid email and password.",
        next: fallbackNext,
      }),
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email,
    },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    redirect(
      buildSigninRedirect({
        error: "Invalid login credentials.",
        next: fallbackNext,
      }),
    );
  }

  const isPasswordValid = await compare(parsed.data.password, user.passwordHash);
  if (!isPasswordValid) {
    redirect(
      buildSigninRedirect({
        error: "Invalid login credentials.",
        next: fallbackNext,
      }),
    );
  }

  if (user.status === "TERMINATED") {
    redirect(
      buildSigninRedirect({
        error: "This account has been terminated.",
        next: fallbackNext,
      }),
    );
  }

  await createUserSession(user.id);
  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  redirect(sanitizeInternalRedirect(parsed.data.next, "/dashboard"));
}
