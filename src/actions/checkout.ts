"use server";

import { cartCheckoutSchema, checkoutSchema } from "@/schemas/checkout";
import { getOrderByExternalId, type Order } from "@/lib/orders";
import { auth } from "@/lib/next-auth";
import { checkoutForUser, type CheckoutResult } from "@/lib/payments/checkout";
import { reconcilePayment } from "@/lib/payments/reconcile";
import { logger } from "@/lib/logger";

export type CheckoutActionState = CheckoutResult;

export async function createCheckoutOrder(_prev: CheckoutActionState, formData: FormData): Promise<CheckoutActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Silakan login terlebih dahulu untuk checkout." };
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  return checkoutForUser(session.user.id, [{ productSlug: data.productSlug, size: data.size, quantity: data.quantity }], data,
    `/checkout?slug=${encodeURIComponent(data.productSlug)}&size=${encodeURIComponent(data.size)}&failed=1`);
}

export async function createCartCheckoutOrder(_prev: CheckoutActionState, formData: FormData): Promise<CheckoutActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Silakan login terlebih dahulu untuk checkout." };
  let items: unknown;
  try { items = JSON.parse(String(formData.get("items") ?? "[]")); } catch { return { ok: false, error: "Data cart tidak valid." }; }
  const parsed = cartCheckoutSchema.safeParse({ ...Object.fromEntries(formData), items });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors, error: parsed.error.flatten().formErrors[0] };
  return checkoutForUser(session.user.id, parsed.data.items, parsed.data, "/checkout?from=cart&failed=1");
}

// A browser cancel/failure redirect is not proof that the invoice is unpayable.
export async function markOrderCancelledIfPending(externalId: string, userId: string): Promise<Order | null> {
  return syncOrderPaymentStatus(externalId, userId);
}

export async function syncOrderPaymentStatus(externalId: string, userId: string): Promise<Order | null> {
  const session = await auth();
  if (!session?.user?.id || session.user.id !== userId || !externalId) return null;
  const order = await getOrderByExternalId(externalId, session.user.id);
  if (!order || order.status !== "PENDING" || !order.gatewayInvoiceId) return order;
  try { await reconcilePayment(externalId); } catch (error) {
    logger.warn("checkout reconciliation failed", { externalId, err: String(error) });
  }
  return getOrderByExternalId(externalId, session.user.id);
}

export async function getCheckoutOrder(externalId: string, userId: string): Promise<Order | null> {
  return syncOrderPaymentStatus(externalId, userId);
}
