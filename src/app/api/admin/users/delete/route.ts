import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        userId?: string;
      }
    | null;

  if (!payload?.userId) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.role === "ADMIN") {
    return NextResponse.json({ error: "Admin accounts cannot be permanently deleted from this action." }, { status: 403 });
  }

  try {
    await prisma.user.delete({
      where: {
        id: targetUser.id,
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not permanently delete this account." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
