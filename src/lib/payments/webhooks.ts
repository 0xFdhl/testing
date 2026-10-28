import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isXenditTestMode } from "@/lib/xendit";
import { reconcilePayment } from "./reconcile";
import type { PaymentEvidence } from "./verification";

const id = z.string().min(1).max(255);
const amount = z.number().int().positive().max(2147483647);
const xenditSchema = z.object({ id, external_id: id, status: z.enum(["PENDING", "PAID", "SETTLED", "EXPIRED"]), currency: z.literal("IDR"), amount });
const stripeSchema = z.object({ id, type: id, data: z.object({ object: z.object({
  id, metadata: z.object({ externalId: id }), currency: z.literal("usd"), amount_total: amount,
  livemode: z.boolean(), payment_status: z.enum(["paid", "unpaid", "no_payment_required"]),
  status: z.enum(["open", "complete", "expired"]),
}) }) });

export function parsePaymentWebhook(provider: "stripe" | "xendit", payload: unknown) {
  if (provider === "xendit") {
    const p = xenditSchema.parse(payload);
    return { eventId: `xendit:${p.id}:${p.status}`, type: "invoice", evidence: {
      invoiceId: p.id, externalId: p.external_id, provider, currency: p.currency, amount: p.amount,
      live: !isXenditTestMode(), status: p.status === "SETTLED" ? "PAID" : p.status,
    } satisfies PaymentEvidence };
  }
  const p = stripeSchema.parse(payload);
  const s = p.data.object;
  return { eventId: `stripe:${p.id}`, type: p.type, evidence: {
    invoiceId: s.id, externalId: s.metadata.externalId, provider, currency: s.currency,
    amount: s.amount_total, live: s.livemode,
    status: s.payment_status === "paid" ? "PAID" : s.status === "expired" ? "EXPIRED" : "PENDING",
  } satisfies PaymentEvidence };
}

export async function processPaymentWebhook(provider: "stripe" | "xendit", payload: unknown) {
  const { eventId, type, evidence } = parsePaymentWebhook(provider, payload);
  // Failed/received deliveries remain retryable; the transaction protects stock.
  const event = await prisma.webhookEvent.upsert({
    where: { eventId }, update: {},
    create: { eventId, type, status: "received", payload: JSON.parse(JSON.stringify(payload)) },
  });
  if (event.status === "processed") return;
  try {
    await reconcilePayment(evidence.externalId, evidence);
    await prisma.webhookEvent.update({ where: { eventId }, data: { status: "processed", processedAt: new Date() } });
  } catch (error) {
    await prisma.webhookEvent.updateMany({ where: { eventId, status: { not: "processed" } }, data: { status: "failed" } });
    throw error;
  }
}
