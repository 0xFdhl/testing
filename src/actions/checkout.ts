"use server";

import {
  cartCheckoutSchema,
  checkoutSchema,
} from "@/schemas/checkout";
import {
  getOrderByExternalId,
  updateOrderByExternalId,
  transitionOrderStatus,
} from "@/lib/orders";
import type { Order, OrderLineItem } from "@/lib/orders";
import { getProductBySlug } from "@/lib/products/db";
import { isSizeAvailable } from "@/lib/products";
import {
  toCheckoutErrorMessage,
} from "@/lib/xendit";
import { prisma } from "@/lib/prisma";
import {
  checkIdempotency,
  rememberIdempotency,
  deriveCheckoutKey,
  deriveCartCheckoutKey,
} from "@/lib/idempotency";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/next-auth";
import {
  resolveGateway,
} from "@/lib/payments/router";
import {
  createCheckout,
  getProviderStatus,
  calculateAmountMinor,
  resolveCurrency,
} from "@/lib/payments";

export type CheckoutActionState = {
  ok: boolean;
  redirectUrl?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_APP_URL wajib diisi di environment production. " +
        "Set ke domain kamu (https://domainkamu.com).",
      );
    }
    return "http://localhost:3000";
  }
  return url;
}

function generateExternalId(): string {
  return `ORD-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 12)}`;
}

async function resolveLineItems(
  items: Array<{ productSlug: string; size: OrderLineItem["size"]; quantity: number }>,
): Promise<{ lineItems: OrderLineItem[]; amount: number } | { error: string }> {
  const lineItems: OrderLineItem[] = [];
  let amount = 0;

  for (const item of items) {
    const product = await getProductBySlug(item.productSlug);
    if (!product) {
      return { error: `Produk "${item.productSlug}" tidak ditemukan.` };
    }
    if (!isSizeAvailable(product, item.size)) {
      return { error: `Ukuran ${item.size} tidak tersedia untuk ${product.name}.` };
    }

    lineItems.push({
      productSlug: product.slug,
      productName: product.name,
      size: item.size,
      quantity: item.quantity,
      unitPrice: product.price,
    });
    amount += product.price * item.quantity;
  }

  return { lineItems, amount };
}

async function processCheckout(
  lineItems: OrderLineItem[],
  amount: number,
  customer: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  },
  failureRedirectUrl: string,
  userId?: string,
  region: "id" | "intrl" = "id",
): Promise<CheckoutActionState> {
  const externalId = generateExternalId();
  const appUrl = getAppUrl();

  const provider = resolveGateway(region);
  const currency = resolveCurrency(provider);
  const amountMinor = calculateAmountMinor(provider, amount);

  try {
    await prisma.$transaction(
      async (tx) => {
      for (const item of lineItems) {
        const product = await tx.product.findUnique({
          where: { slug: item.productSlug },
        });
        if (!product) {
          throw new Error(`Produk "${item.productSlug}" tidak ditemukan.`);
        }
        const stock = product.stock as Record<string, number>;
        const currentStock = stock[item.size] ?? 0;
        if (currentStock < item.quantity) {
          throw new Error(`Stok ${item.size} untuk ${product.name} tidak mencukupi. Tersisa ${currentStock}.`);
        }
        stock[item.size] = currentStock - item.quantity;
        const result = await tx.product.updateMany({
          where: { slug: item.productSlug, updatedAt: product.updatedAt },
          data: { stock: stock as object },
        });
        if (result.count === 0) {
          throw new Error(`Stok ${item.size} untuk ${product.name} berubah, coba lagi.`);
        }
      }

      await tx.order.create({
        data: {
          externalId,
          userId,
          lineItems: lineItems as object,
          amount,
          customerName: customer.customerName,
          customerEmail: customer.customerEmail,
          customerPhone: customer.customerPhone,
          provider,
          currency,
          status: "PENDING",
        },
      });

    },
      { isolationLevel: "Serializable" },
    );

    const description =
      lineItems.length === 1
        ? `${lineItems[0].productName} (${lineItems[0].size}) x${lineItems[0].quantity}`
        : `${lineItems.length} items — yourbrand order`;

    const encodedExternalId = encodeURIComponent(externalId);
    const session = await createCheckout(provider, {
      externalId,
      amountMinor,
      currency,
      description,
      customerEmail: customer.customerEmail,
      customerName: customer.customerName,
      customerPhone: customer.customerPhone,
      items: lineItems.map((item) => ({
        name: `${item.productName} — ${item.size}`,
        quantity: item.quantity,
        unitPriceMinor: item.unitPrice,
      })),
      successUrl: `${appUrl}/checkout/success?order=${encodedExternalId}`,
      cancelUrl: `${failureRedirectUrl}${failureRedirectUrl.includes("?") ? "&" : "?"}order=${encodedExternalId}`,
    });

    await updateOrderByExternalId(externalId, {
      gatewayInvoiceId: session.sessionId,
      invoiceUrl: session.url,
    });

    return { ok: true, redirectUrl: session.url };
  } catch (err) {
    logger.error("checkout.processCheckout failed", { externalId, provider, err: String(err) });
    await transitionOrderStatus(externalId, "PENDING", "CANCELLED", { cancelledAt: new Date() });
    return { ok: false, error: toCheckoutErrorMessage(err) };
  }
}

export async function createCheckoutOrder(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Silakan login terlebih dahulu untuk checkout." };
  }
  const userId = session.user.id;

  const parsed = checkoutSchema.safeParse({
    productSlug: formData.get("productSlug"),
    size: formData.get("size"),
    quantity: formData.get("quantity"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const data = parsed.data;
  const region = session.user.region ?? "id";

  const idemKey = deriveCheckoutKey(userId, {
    productSlug: data.productSlug,
    size: data.size,
    quantity: data.quantity,
    customerEmail: data.customerEmail,
  });
  const cached = checkIdempotency<CheckoutActionState>(idemKey);
  if (cached.hit) return cached.result;

  const resolved = await resolveLineItems([
    {
      productSlug: data.productSlug,
      size: data.size,
      quantity: data.quantity,
    },
  ]);

  if ("error" in resolved) {
    return { ok: false, error: resolved.error };
  }

  const result = await processCheckout(
    resolved.lineItems,
    resolved.amount,
    {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
    },
    `${getAppUrl()}/checkout?slug=${encodeURIComponent(data.productSlug)}&size=${encodeURIComponent(data.size)}&failed=1`,
    userId,
    region,
  );

  if (result.ok) rememberIdempotency(idemKey, result);
  return result;
}

export async function createCartCheckoutOrder(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Silakan login terlebih dahulu untuk checkout." };
  }
  const userId = session.user.id;

  let itemsRaw: unknown;
  try {
    itemsRaw = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, error: "Data cart tidak valid." };
  }

  const parsed = cartCheckoutSchema.safeParse({
    items: itemsRaw,
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
      error: parsed.error.flatten().formErrors[0],
    };
  }

  const region = session.user.region ?? "id";

  const idemKey = deriveCartCheckoutKey(userId, {
    items: parsed.data.items.map((i) => ({
      productSlug: i.productSlug,
      size: i.size,
      quantity: i.quantity,
    })),
    customerEmail: parsed.data.customerEmail,
  });
  const cached = checkIdempotency<CheckoutActionState>(idemKey);
  if (cached.hit) return cached.result;

  const resolved = await resolveLineItems(parsed.data.items);
  if ("error" in resolved) {
    return { ok: false, error: resolved.error };
  }

  const result = await processCheckout(
    resolved.lineItems,
    resolved.amount,
    {
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
    },
    `${getAppUrl()}/checkout?from=cart&failed=1`,
    userId,
    region,
  );

  if (result.ok) rememberIdempotency(idemKey, result);
  return result;
}

/** Dipanggil saat user balik dari failure_redirect_url gateway */
export async function markOrderCancelledIfPending(
  externalId: string,
  userId: string,
): Promise<Order | null> {
  const order = await getOrderByExternalId(externalId, userId);
  if (!order || order.status !== "PENDING") return order ?? null;

  const ok = await transitionOrderStatus(
    externalId,
    "PENDING",
    "CANCELLED",
    { cancelledAt: new Date() },
    userId,
  );
  if (!ok) return getOrderByExternalId(externalId, userId);
  return getOrderByExternalId(externalId, userId);
}

export async function syncOrderPaymentStatus(
  externalId: string,
  userId: string,
): Promise<Order | null> {
  const order = await getOrderByExternalId(externalId, userId);
  if (!order) return null;

  if (
    order.status === "PAID" ||
    order.status === "EXPIRED" ||
    order.status === "CANCELLED"
  ) {
    return order;
  }

  const provider = order.provider;
  const gatewayId = order.gatewayInvoiceId ?? order.xenditInvoiceId;
  if (!gatewayId) return order;

  try {
    const status = await getProviderStatus(provider, gatewayId);

    if (status === "PAID") {
      await transitionOrderStatus(
        externalId,
        "PENDING",
        "PAID",
        { paidAt: new Date() },
        userId,
      );
      return getOrderByExternalId(externalId, userId) ?? order;
    }

    if (status === "EXPIRED") {
      await transitionOrderStatus(
        externalId,
        "PENDING",
        "EXPIRED",
        { expiredAt: new Date() },
        userId,
      );
      return getOrderByExternalId(externalId, userId) ?? order;
    }
  } catch {
    return order;
  }

  return order;
}

export async function getCheckoutOrder(
  externalId: string,
  userId: string,
): Promise<Order | null> {
  if (!externalId) return null;
  return syncOrderPaymentStatus(externalId, userId);
}
