import "server-only";
import { prisma } from "@/lib/prisma";
import { transitionOrderStatus } from "@/lib/orders";
import { getInvoice, isPaidStatus, isXenditTestMode } from "@/lib/xendit";
import { getSession, isStripeTestMode } from "@/lib/stripe";
import { assertPaymentMatches, type PaymentEvidence, type PaymentExpectation } from "./verification";

export async function readPaymentEvidence(order: PaymentExpectation): Promise<PaymentEvidence> {
  if (!order.gatewayInvoiceId) throw new Error("Invoice not attached yet");
  const live = order.provider === "stripe" ? !isStripeTestMode() : !isXenditTestMode();
  if (live !== order.paymentLive) throw new Error("Payment environment mismatch");
  if (order.provider === "stripe") {
    const session = await getSession(order.gatewayInvoiceId);
    return {
      invoiceId: session.id, externalId: session.metadata?.externalId,
      provider: "stripe", currency: session.currency, amount: session.amount_total,
      live: session.livemode,
      status: session.payment_status === "paid" ? "PAID" : session.status === "expired" ? "EXPIRED" : "PENDING",
    };
  }
  const invoice = await getInvoice(order.gatewayInvoiceId);
  return {
    invoiceId: invoice.id, externalId: invoice.external_id, provider: "xendit",
    currency: invoice.currency, amount: invoice.amount, live,
    status: isPaidStatus(invoice.status) ? "PAID" : invoice.status === "EXPIRED" ? "EXPIRED" : "PENDING",
  };
}

// All paths (webhooks, customer refresh, admin retry) use the same binding checks.
export async function reconcilePayment(externalId: string, callback?: PaymentEvidence) {
  const order = await prisma.order.findUnique({ where: { externalId } });
  if (!order) throw new Error("Order not found");
  if (callback) assertPaymentMatches(order, callback);
  const evidence = await readPaymentEvidence(order);
  assertPaymentMatches(order, evidence);
  if (evidence.status === "PENDING") {
    if (callback && callback.status !== "PENDING") throw new Error("Provider has not confirmed terminal status yet");
    return "PENDING";
  }
  if (order.status === evidence.status) return evidence.status;
  if (order.status !== "PENDING") throw new Error("Conflicting terminal payment; manual reconciliation required");
  const changed = await transitionOrderStatus(externalId, "PENDING", evidence.status,
    evidence.status === "PAID" ? { paidAt: new Date() } : { expiredAt: new Date() });
  if (!changed) {
    const latest = await prisma.order.findUnique({ where: { externalId } });
    if (latest?.status !== evidence.status) throw new Error("Concurrent payment transition; retry required");
  }
  return evidence.status;
}
