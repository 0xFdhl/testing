import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getOrderByExternalId,
} from "@/lib/orders";
import { transitionOrderStatus } from "@/lib/orders";
import {
  isPaidStatus,
  isXenditTestMode,
  verifyWebhookToken,
  type XenditWebhookPayload,
} from "@/lib/xendit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  if (!verifyWebhookToken(req)) {
    logger.warn("webhook.xendit signature invalid", {
      hasToken: req.headers.has("x-callback-token"),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: string;
  let payload: XenditWebhookPayload;
  try {
    rawBody = await req.text();
    payload = JSON.parse(rawBody) as XenditWebhookPayload;
  } catch {
    logger.warn("webhook.xendit invalid json", {});
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id: eventId, external_id: externalId, status } = payload;
  if (!eventId || !externalId || !status) {
    return NextResponse.json(
      { error: "Missing event id, external_id or status" },
      { status: 400 },
    );
  }

  // Idempotency: skip if already processed
  const existing = await prisma.webhookEvent.findUnique({
    where: { eventId },
  });
  if (existing) {
    return NextResponse.json({ received: true, note: "duplicate" });
  }

  // Persist event immediately for audit trail
  await prisma.webhookEvent.create({
    data: {
      eventId,
      type: "invoice",
      status: "received",
      payload: JSON.parse(rawBody),
    },
  });

  const order = await getOrderByExternalId(externalId);
  if (!order) {
    return NextResponse.json({ received: true, note: "order_not_found" });
  }

  if (order.status === "PAID" || order.status === "CANCELLED") {
    return NextResponse.json({ received: true, note: "terminal_status" });
  }

  try {
    if (isPaidStatus(status)) {
      await transitionOrderStatus(externalId, "PENDING", "PAID", { paidAt: new Date() });
    } else if (status === "EXPIRED") {
      await transitionOrderStatus(externalId, "PENDING", "EXPIRED", { expiredAt: new Date() });
    }

    await prisma.webhookEvent.update({
      where: { eventId },
      data: { status: "processed", processedAt: new Date() },
    });

    return NextResponse.json({
      received: true,
      mode: isXenditTestMode() ? "test" : "live",
    });
  } catch (err) {
    logger.error("webhook.xendit processing failed", { eventId, externalId, err: String(err) });
    await prisma.webhookEvent.update({
      where: { eventId },
      data: { status: "failed", processedAt: new Date() },
    });
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 },
    );
  }
}
