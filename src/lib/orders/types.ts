import type { DisplaySize } from "@/lib/products/types";

export type OrderStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

export type OrderLineItem = {
  productSlug: string;
  productName: string;
  size: DisplaySize;
  quantity: number;
  unitPrice: number;
};

export type Provider = "xendit" | "stripe";
export type OrderCurrency = "IDR" | "USD";

export type Order = {
  externalId: string;
  userId?: string;
  xenditInvoiceId?: string;
  gatewayInvoiceId?: string;
  invoiceUrl?: string;
  provider: Provider;
  currency: OrderCurrency;
  status: OrderStatus;
  lineItems: OrderLineItem[];
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdAt: Date;
  paidAt?: Date;
  expiredAt?: Date;
  cancelledAt?: Date;
};

export type CreateOrderInput = {
  externalId: string;
  userId?: string;
  lineItems: OrderLineItem[];
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  provider?: Provider;
  currency?: OrderCurrency;
};

export type UpdateOrderInput = {
  status?: OrderStatus;
  xenditInvoiceId?: string;
  gatewayInvoiceId?: string;
  invoiceUrl?: string;
  provider?: Provider;
  currency?: OrderCurrency;
  paidAt?: Date;
  expiredAt?: Date;
  cancelledAt?: Date;
};
