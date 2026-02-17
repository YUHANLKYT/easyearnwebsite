import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { CHAT_MESSAGE_COOLDOWN_SECONDS, CHAT_UNLOCK_LEVEL } from "@/lib/constants";
import { getLevelFromLifetimeEarnings } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeMessage(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getPublicChatName(name: string, anonymousMode: boolean, role: "USER" | "ADMIN") {
  if (role !== "ADMIN" && anonymousMode) {
    return "Hidden";
  }
  return name;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await prisma.chatMessage.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 60,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          anonymousMode: true,
          role: true,
          lifetimeEarnedCents: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: messages.reverse().map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      userName: getPublicChatName(entry.user.name, entry.user.anonymousMode, entry.user.role),
      userAnonymous: entry.user.role !== "ADMIN" && entry.user.anonymousMode,
      userRole: entry.user.role,
      userLevel: getLevelFromLifetimeEarnings(entry.user.lifetimeEarnedCents),
      message: entry.message,
      createdAt: entry.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const level = getLevelFromLifetimeEarnings(user.lifetimeEarnedCents);
  if (level < CHAT_UNLOCK_LEVEL) {
    return NextResponse.json({ error: "Chat unlocks at level 1." }, { status: 403 });
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Muted or terminated accounts cannot send messages." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as { message?: string } | null;
  const message = normalizeMessage(payload?.message ?? "");

  if (message.length < 1 || message.length > 240) {
    return NextResponse.json({ error: "Message must be between 1 and 240 characters." }, { status: 400 });
  }

  const latestOwnMessage = await prisma.chatMessage.findFirst({
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

  if (latestOwnMessage) {
    const minNextMessageTime = latestOwnMessage.createdAt.getTime() + CHAT_MESSAGE_COOLDOWN_SECONDS * 1000;
    if (minNextMessageTime > Date.now()) {
      const waitSeconds = Math.max(1, Math.ceil((minNextMessageTime - Date.now()) / 1000));
      return NextResponse.json(
        { error: `Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before sending again.` },
        { status: 429 },
      );
    }
  }

  const created = await prisma.chatMessage.create({
    data: {
      userId: user.id,
      message,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          anonymousMode: true,
          role: true,
          lifetimeEarnedCents: true,
        },
      },
    },
  });

  return NextResponse.json({
    item: {
      id: created.id,
      userId: created.userId,
      userName: getPublicChatName(created.user.name, created.user.anonymousMode, created.user.role),
      userAnonymous: created.user.role !== "ADMIN" && created.user.anonymousMode,
      userRole: created.user.role,
      userLevel: getLevelFromLifetimeEarnings(created.user.lifetimeEarnedCents),
      message: created.message,
      createdAt: created.createdAt.toISOString(),
    },
  });
}
