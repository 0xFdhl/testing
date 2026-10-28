import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { verifyWebhookToken } from "@/lib/xendit";
import { processPaymentWebhook } from "@/lib/payments/webhooks";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  if (!verifyWebhookToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let payload;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  try {
    await processPaymentWebhook("xendit", payload);
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("webhook.xendit rejected", { err: String(error) });
    return NextResponse.json({ error: "Payment could not be verified" }, { status: error instanceof ZodError ? 400 : 500 });
  }
}
