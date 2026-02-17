import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ComplaintAction = "resolve" | "reopen";

function isComplaintAction(value: string): value is ComplaintAction {
  return value === "resolve" || value === "reopen";
}

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        complaintId?: string;
        action?: string;
      }
    | null;

  if (!payload?.complaintId || !payload.action || !isComplaintAction(payload.action)) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const complaint = await prisma.complaint.findUnique({
    where: {
      id: payload.complaintId,
    },
    select: {
      id: true,
    },
  });

  if (!complaint) {
    return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  }

  if (payload.action === "resolve") {
    await prisma.complaint.update({
      where: {
        id: complaint.id,
      },
      data: {
        status: "RESOLVED",
        handledById: admin.id,
        resolvedAt: new Date(),
      },
    });
  } else {
    await prisma.complaint.update({
      where: {
        id: complaint.id,
      },
      data: {
        status: "OPEN",
        handledById: admin.id,
        resolvedAt: null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
