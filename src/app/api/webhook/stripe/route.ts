import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { verifyWebhookSignature } from "@/lib/stripe";
import { processPaymentWebhook } from "@/lib/payments/webhooks";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(req, raw)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let payload;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!payload || typeof payload.type !== "string") return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.expired"].includes(payload.type)) return NextResponse.json({ received: true });
  try {
    await processPaymentWebhook("stripe", payload);
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("webhook.stripe rejected", { err: String(error) });
    return NextResponse.json({ error: "Payment could not be verified" }, { status: error instanceof ZodError ? 400 : 500 });
  }
}
