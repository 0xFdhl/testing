import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrderByExternalId } from "@/lib/orders";
import { transitionOrderStatus } from "@/lib/orders";
import { isStripeTestMode, verifyWebhookSignature } from "@/lib/stripe";
import type { StripeWebhookEvent } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  let rawBody: string;
  let payload: StripeWebhookEvent;

  try {
    rawBody = await req.text();
    payload = JSON.parse(rawBody) as StripeWebhookEvent;
  } catch {
    logger.warn("webhook.stripe invalid json", {});
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!verifyWebhookSignature(req, rawBody)) {
    logger.warn("webhook.stripe signature invalid", {
      hasHeader: req.headers.has("stripe-signature"),
      eventId: payload?.id,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, type, data } = payload;
  if (!eventId || !type || !data?.object) {
    return NextResponse.json(
      { error: "Missing event id, type or data.object" },
      { status: 400 },
    );
  }

  const obj = data.object as Record<string, unknown>;
  const externalId = (obj.metadata as Record<string, string> | undefined)?.externalId;

  if (!externalId) {
    return NextResponse.json({ received: true, note: "no_external_id" });
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
      type,
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
    if (type === "checkout.session.completed") {
      const paymentStatus = obj.payment_status as string;
      if (paymentStatus === "paid") {
        await transitionOrderStatus(externalId, "PENDING", "PAID", { paidAt: new Date() });
      }
    } else if (type === "checkout.session.expired") {
      await transitionOrderStatus(externalId, "PENDING", "EXPIRED", { expiredAt: new Date() });
    }

    await prisma.webhookEvent.update({
      where: { eventId },
      data: { status: "processed", processedAt: new Date() },
    });

    return NextResponse.json({
      received: true,
      mode: isStripeTestMode() ? "test" : "live",
    });
  } catch (err) {
    logger.error("webhook.stripe processing failed", { eventId, externalId, err: String(err) });
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
