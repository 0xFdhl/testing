export const STRIPE_API_BASE = "https://api.stripe.com";

export type StripeCheckoutSessionStatus = "open" | "complete" | "expired";

export type StripePaymentStatus = "unpaid" | "paid" | "no_payment_required";

export type StripeCheckoutSession = {
  id: string;
  object: "checkout.session";
  url: string | null;
  status: StripeCheckoutSessionStatus | null;
  payment_status: StripePaymentStatus;
  amount_total: number;
  currency: string;
  customer_email: string | null;
  metadata: Record<string, string>;
  expires_at: number | null;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
};
