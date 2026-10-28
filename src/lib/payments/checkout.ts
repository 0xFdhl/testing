import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { OrderLineItem } from "@/lib/orders";
import { emitOrderNotification } from "@/lib/notifications/emit";
import { logger } from "@/lib/logger";
import { isStripeTestMode } from "@/lib/stripe";
import { isXenditTestMode } from "@/lib/xendit";
import { createCheckout, calculateAmountMinor, resolveCurrency } from "./index";
import { resolveGateway } from "./router";

type Customer = { customerName: string; customerEmail: string; customerPhone: string };
type Item = { productSlug: string; size: OrderLineItem["size"]; quantity: number };
export type CheckoutResult = { ok: boolean; redirectUrl?: string; error?: string; fieldErrors?: Record<string, string[]> };

export function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured && process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_APP_URL is required");
  return configured ?? "http://localhost:3000";
}

function pendingResult(order: { invoiceUrl: string | null }): CheckoutResult {
  return order.invoiceUrl ? { ok: true, redirectUrl: order.invoiceUrl } : {
    ok: false, error: "Checkout sedang diproses atau perlu rekonsiliasi. Periksa pesanan sebelum mencoba pembayaran lain.",
  };
}

export async function checkoutForUser(userId: string, items: Item[], input: Customer, cancelPath: string): Promise<CheckoutResult> {
  const customer: Customer = { customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { region: true } });
  if (!user) return { ok: false, error: "Silakan login kembali." };
  const provider = resolveGateway(user.region);
  const currency = resolveCurrency(provider);
  const paymentLive = provider === "stripe" ? !isStripeTestMode() : !isXenditTestMode();
  const grouped = new Map<string, Item>();
  for (const item of items) {
    const key = JSON.stringify([item.productSlug, item.size]);
    const previous = grouped.get(key);
    grouped.set(key, { ...item, quantity: item.quantity + (previous?.quantity ?? 0) });
  }
  const canonicalItems = [...grouped.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const checkoutKey = createHash("sha256").update(JSON.stringify([userId, provider, paymentLive, canonicalItems, customer])).digest("hex");
  const externalId = `ORD-${randomUUID()}`;
  let reserved = false;
  try {
    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { checkoutKey } });
      if (existing) return existing;
      if (await tx.order.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 60_000) } } }) >= 5) {
        throw new Error("Checkout rate limit");
      }
      const products = await tx.product.findMany({
        where: { slug: { in: [...new Set(canonicalItems.map((item) => item.productSlug))] } },
      });
      const productsBySlug = new Map(products.map((product) => [product.slug, product]));
      const lineItems: OrderLineItem[] = [];
      for (const item of canonicalItems) {
        const product = productsBySlug.get(item.productSlug);
        if (!product || !Array.isArray(product.sizes) || !product.sizes.includes(item.size)) throw new Error("Product or size unavailable");
        const stock = { ...(product.stock as Record<string, number>) };
        if (!Number.isSafeInteger(stock[item.size]) || stock[item.size] < item.quantity) throw new Error("Insufficient stock");
        stock[item.size] -= item.quantity;
        const changed = await tx.product.updateMany({ where: { id: product.id, updatedAt: product.updatedAt }, data: { stock } });
        if (changed.count !== 1) throw new Error("Stock changed; retry checkout");
        lineItems.push({ ...item, productName: product.name, unitPrice: product.price });
      }
      const amount = lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      // Round each unit exactly once, then sum the same units Stripe receives.
      const paymentAmount = lineItems.reduce((sum, item) => sum + calculateAmountMinor(provider, item.unitPrice) * item.quantity, 0);
      if ([amount, paymentAmount].some((n) => !Number.isSafeInteger(n) || n <= 0 || n > 2147483647)) throw new Error("Invalid payment amount");
      if (lineItems.some((item) => calculateAmountMinor(provider, item.unitPrice) <= 0)) throw new Error("Invalid unit price");
      return tx.order.create({ data: { externalId, userId, checkoutKey, lineItems: lineItems as object, amount, paymentAmount, paymentLive, provider, currency, ...customer, status: "PENDING" } });
    }, { isolationLevel: "Serializable" });
    if (order.externalId !== externalId) return pendingResult(order);
    reserved = true;
    const lineItems = order.lineItems as OrderLineItem[];
    const appUrl = getAppUrl();
    const session = await createCheckout(provider, {
      externalId, amountMinor: order.paymentAmount!, currency, ...customer,
      description: `Order ${externalId}`,
      items: lineItems.map((item) => ({ name: `${item.productName} — ${item.size}`, quantity: item.quantity, unitPriceMinor: calculateAmountMinor(provider, item.unitPrice) })),
      successUrl: `${appUrl}/checkout/success?order=${encodeURIComponent(externalId)}`,
      cancelUrl: `${appUrl}${cancelPath}&order=${encodeURIComponent(externalId)}`,
    });
    if (!session.sessionId || !session.url) throw new Error("Invalid checkout response");
    // Do not swallow DB attachment failures: the invoice may already be payable.
    await prisma.order.update({ where: { externalId }, data: { gatewayInvoiceId: session.sessionId, invoiceUrl: session.url } });
    await emitOrderNotification({ externalId, userId, customerName: customer.customerName, amount: order.amount, status: "PENDING" }, "order_created");
    return { ok: true, redirectUrl: session.url };
  } catch (error) {
    logger.error("checkout failed", { externalId, provider, reserved, err: String(error) });
    const existing = await prisma.order.findUnique({ where: { checkoutKey } });
    if (existing) return pendingResult(existing);
    // Never release stock/cancel after a network timeout: the gateway may have
    // accepted the request. A pending reservation must be reconciled first.
    return { ok: false, error: "Checkout belum berhasil. Periksa stok dan pesanan, lalu coba kembali." };
  }
}
