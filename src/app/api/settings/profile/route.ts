import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeInternalRedirect, updateProfileSettingsSchema } from "@/lib/validation";

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
  const parsed = updateProfileSettingsSchema.safeParse({
    name: formData.get("name"),
    anonymousMode: formData.get("anonymousMode"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect(
      buildRedirect(redirectTo, {
        error: "Enter a valid display name.",
      }),
    );
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      name: parsed.data.name,
      anonymousMode: parsed.data.anonymousMode === "on",
    },
  });

  redirect(
    buildRedirect(redirectTo, {
      notice: "Profile settings updated.",
    }),
  );
}
