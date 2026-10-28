import type { IndonesiaInvoicePaymentMethod } from "./payment-methods";

export const XENDIT_API_BASE = "https://api.xendit.co";

export type XenditInvoiceStatus =
  | "PENDING"
  | "PAID"
  | "SETTLED"
  | "EXPIRED";

export type CreateInvoiceInput = {
  externalId: string;
  amount: number;
  payerEmail: string;
  description: string;
  customer: {
    given_names: string;
    email: string;
    mobile_number?: string;
  };
  items: Array<{ name: string; quantity: number; price: number }>;
  successRedirectUrl: string;
  failureRedirectUrl: string;
  invoiceDurationSeconds?: number;
  /** Override payment methods; default = semua channel Indonesia */
  paymentMethods?: readonly IndonesiaInvoicePaymentMethod[];
};

export type XenditInvoice = {
  currency: string;
  id: string;
  external_id: string;
  status: XenditInvoiceStatus;
  amount: number;
  invoice_url: string;
  expiry_date: string;
  payment_method?: string;
  payment_channel?: string;
};

export type XenditWebhookPayload = {
  id: string;
  external_id: string;
  status: XenditInvoiceStatus;
  amount: number;
  payment_method?: string;
  payment_channel?: string;
};
