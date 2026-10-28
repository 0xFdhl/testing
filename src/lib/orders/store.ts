import { prisma } from "@/lib/prisma";
import { emitOrderNotification, notificationEventForStatus } from "@/lib/notifications/emit";
import type { Order, UpdateOrderInput } from "./types";
import { addItemsToStock, getRestockLineItems } from "./stock";

function toOrder(row: { externalId: string; userId: string | null; xenditInvoiceId: string | null; gatewayInvoiceId: string | null; invoiceUrl: string | null; provider: string; currency: string; status: string; lineItems: unknown; amount: number; customerName: string; customerEmail: string; customerPhone: string; createdAt: Date; paidAt: Date | null; expiredAt: Date | null; cancelledAt: Date | null }): Order {
  return {
    externalId: row.externalId,
    userId: row.userId ?? undefined,
    xenditInvoiceId: row.xenditInvoiceId ?? undefined,
    gatewayInvoiceId: row.gatewayInvoiceId ?? undefined,
    invoiceUrl: row.invoiceUrl ?? undefined,
    provider: row.provider as Order["provider"],
    currency: row.currency as Order["currency"],
    status: row.status as Order["status"],
    lineItems: row.lineItems as Order["lineItems"],
    amount: row.amount,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    createdAt: row.createdAt,
    paidAt: row.paidAt ?? undefined,
    expiredAt: row.expiredAt ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
  };
}

export async function getOrderByExternalId(
  externalId: string,
  userId?: string,
): Promise<Order | null> {
  const row = await prisma.order.findFirst({
    where: userId ? { externalId, userId } : { externalId },
  });
  if (!row) return null;
  return toOrder(row);
}

export async function transitionOrderStatus(
  externalId: string,
  from: Order["status"],
  to: Order["status"],
  patch: Partial<UpdateOrderInput> = {},
  userId?: string,
): Promise<boolean> {
  const data: Record<string, unknown> = { status: to };
  if (to !== "PENDING") data.checkoutKey = null;
  if (patch.paidAt) data.paidAt = patch.paidAt;
  if (patch.expiredAt) data.expiredAt = patch.expiredAt;
  if (patch.cancelledAt) data.cancelledAt = patch.cancelledAt;

  const shouldRestoreStock =
    from === "PENDING" && (to === "CANCELLED" || to === "EXPIRED");

  const transitionedOrder = await prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          externalId,
          status: from,
          ...(userId ? { userId } : {}),
        },
      });
      if (!order) return null;

      const result = await tx.order.updateMany({
        where: { id: order.id, status: from },
        data,
      });
      if (result.count === 0) return null;

      if (shouldRestoreStock) {
        const items = getRestockLineItems(order.lineItems);
        const byProduct = new Map<string, typeof items>();
        for (const item of items) {
          const existing = byProduct.get(item.productSlug) ?? [];
          existing.push(item);
          byProduct.set(item.productSlug, existing);
        }

        for (const [productSlug, productItems] of byProduct) {
          const product = await tx.product.findUnique({ where: { slug: productSlug } });
          if (!product) continue;
          const nextStock = addItemsToStock(
            product.stock as Record<string, number>,
            productItems,
          );
          const restored = await tx.product.updateMany({
            where: { id: product.id, updatedAt: product.updatedAt },
            data: { stock: nextStock },
          });
          if (restored.count === 0) {
            throw new Error(`Stock changed while restoring ${productSlug}`);
          }
        }
      }

      return order;
    },
    { isolationLevel: "Serializable" },
  );
  if (!transitionedOrder) return false;

  const event = notificationEventForStatus(to);
  if (event) {
    await emitOrderNotification(
      {
        externalId: transitionedOrder.externalId,
        userId: transitionedOrder.userId ?? undefined,
        customerName: transitionedOrder.customerName,
        amount: transitionedOrder.amount,
        status: to,
      },
      event,
    );
  }

  return true;
}

export async function getOrdersByUserId(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<{ orders: Order[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.order.count({ where: { userId } }),
  ]);
  return { orders: rows.map(toOrder), total };
}
