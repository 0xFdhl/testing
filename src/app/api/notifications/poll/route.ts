import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { auth } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import type { NotificationEvent, NotificationPayload } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const admin = !userId ? await getSession() : null;

  const url = new URL(req.url);
  const sinceRaw = url.searchParams.get("since");
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? new Date(sinceRaw) : undefined;

  const where: {
    createdAt?: { gt: Date };
    OR?: Array<Record<string, unknown>>;
  } = {};
  if (since) where.createdAt = { gt: since };
  if (userId) {
    where.OR = [{ userId }];
  } else if (!admin) {
    return NextResponse.json({ items: [], now: new Date().toISOString() });
  }

  const rows = await prisma.notificationLog.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      event: true,
      externalId: true,
      title: true,
      message: true,
      sound: true,
      createdAt: true,
    },
  });

  const items: NotificationPayload[] = rows.map((r) => ({
    id: r.id,
    event: r.event as NotificationEvent,
    title: r.title,
    message: r.message,
    sound: r.sound,
    externalId: r.externalId,
    url: null,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ items, now: new Date().toISOString() });
}