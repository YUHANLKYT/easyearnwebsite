import { redirect } from "next/navigation";

import { destroyCurrentSession } from "@/lib/auth";
import { sanitizeInternalRedirect } from "@/lib/validation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const redirectTo = sanitizeInternalRedirect(formData.get("redirectTo")?.toString(), "/");

  await destroyCurrentSession();
  redirect(redirectTo);
}
