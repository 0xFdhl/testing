export type Provider = "xendit" | "stripe";
export type Region = "id" | "intrl";
export type Currency = "IDR" | "USD";

export type CreateCheckoutInput = {
  externalId: string;
  amountMinor: number;
  currency: Currency;
  description: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  items: Array<{ name: string; quantity: number; unitPriceMinor: number }>;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = {
  provider: Provider;
  sessionId: string;
  url: string;
  status: "PENDING";
  expiresAt?: Date;
};

export type ProviderStatus = "PENDING" | "PAID" | "EXPIRED";
