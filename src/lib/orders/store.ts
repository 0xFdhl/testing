import { prisma } from "@/lib/prisma";
import type { CreateOrderInput, Order, UpdateOrderInput } from "./types";

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

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const row = await prisma.order.create({
    data: {
      externalId: input.externalId,
      userId: input.userId,
      lineItems: input.lineItems as object,
      amount: input.amount,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      provider: input.provider ?? "xendit",
      currency: input.currency ?? "IDR",
      status: "PENDING",
    },
  });
  return toOrder(row);
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

export async function updateOrderByExternalId(
  externalId: string,
  patch: UpdateOrderInput,
  userId?: string,
): Promise<Order | null> {
  const data: Record<string, unknown> = {};
  if ("xenditInvoiceId" in patch) data.xenditInvoiceId = patch.xenditInvoiceId;
  if ("gatewayInvoiceId" in patch) data.gatewayInvoiceId = patch.gatewayInvoiceId;
  if ("invoiceUrl" in patch) data.invoiceUrl = patch.invoiceUrl;
  if ("provider" in patch) data.provider = patch.provider;
  if ("currency" in patch) data.currency = patch.currency;
  if ("status" in patch) data.status = patch.status;
  if ("paidAt" in patch) data.paidAt = patch.paidAt;
  if ("expiredAt" in patch) data.expiredAt = patch.expiredAt;
  if ("cancelledAt" in patch) data.cancelledAt = patch.cancelledAt;

  const where = userId ? { externalId, userId } : { externalId };
  if (userId) {
    const updated = await prisma.order.updateMany({ where, data }).catch(() => ({ count: 0 }));
    if (updated.count === 0) return null;
  }
  const row = await prisma.order.update({ where: { externalId }, data }).catch(() => null);
  return row ? toOrder(row) : null;
}

export async function transitionOrderStatus(
  externalId: string,
  from: Order["status"],
  to: Order["status"],
  patch: Partial<UpdateOrderInput> = {},
  userId?: string,
): Promise<boolean> {
  const data: Record<string, unknown> = { status: to };
  if (patch.paidAt) data.paidAt = patch.paidAt;
  if (patch.expiredAt) data.expiredAt = patch.expiredAt;
  if (patch.cancelledAt) data.cancelledAt = patch.cancelledAt;

  const where: Record<string, unknown> = { externalId, status: from };
  if (userId) where.userId = userId;

  const result = await prisma.order.updateMany({ where, data });
  return result.count > 0;
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
