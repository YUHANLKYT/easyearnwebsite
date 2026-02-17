import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AccountStatus = "ACTIVE" | "MUTED" | "TERMINATED";

function isValidStatus(value: string): value is AccountStatus {
  return value === "ACTIVE" || value === "MUTED" || value === "TERMINATED";
}

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        userId?: string;
        status?: string;
      }
    | null;

  if (!payload?.userId || !payload.status || !isValidStatus(payload.status)) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
  const nextStatus: AccountStatus = payload.status;

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

  if (targetUser.role === "ADMIN" && targetUser.id !== admin.id) {
    return NextResponse.json({ error: "Cannot moderate another admin account." }, { status: 403 });
  }

  if (targetUser.id === admin.id && nextStatus !== "ACTIVE") {
    return NextResponse.json({ error: "You cannot mute or terminate your own admin account." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        status: nextStatus,
      },
    });

    if (nextStatus === "TERMINATED") {
      await tx.session.deleteMany({
        where: {
          userId: targetUser.id,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
