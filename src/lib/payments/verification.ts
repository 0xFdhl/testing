import type { Provider } from "./types";

export type PaymentExpectation = {
  externalId: string;
  gatewayInvoiceId: string | null;
  provider: Provider;
  currency: string;
  paymentAmount: number | null;
  paymentLive: boolean | null;
};

export type PaymentEvidence = {
  externalId: string;
  invoiceId: string;
  provider: Provider;
  currency: string;
  amount: number;
  live: boolean;
  status: "PENDING" | "PAID" | "EXPIRED";
};

export function assertPaymentMatches(order: PaymentExpectation, evidence: PaymentEvidence) {
  if (!order.gatewayInvoiceId || !Number.isSafeInteger(order.paymentAmount) ||
      (order.paymentAmount ?? 0) <= 0 || typeof order.paymentLive !== "boolean") {
    throw new Error("Payment snapshot missing; reconciliation required");
  }
  if (order.externalId !== evidence.externalId || order.gatewayInvoiceId !== evidence.invoiceId ||
      order.provider !== evidence.provider || order.currency.toUpperCase() !== evidence.currency.toUpperCase() ||
      order.paymentAmount !== evidence.amount || order.paymentLive !== evidence.live) {
    throw new Error("Payment evidence does not match the order");
  }
}
