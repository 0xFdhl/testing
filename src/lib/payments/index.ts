import "server-only";
import { createInvoice } from "@/lib/xendit";
import { createCheckoutSession, isStripeTestMode } from "@/lib/stripe";
import { idrToUsdCents } from "./currency";
import type {
  CreateCheckoutInput,
  CheckoutSession,
  Provider,
} from "./types";

export async function createCheckout(
  provider: Provider,
  input: CreateCheckoutInput,
): Promise<CheckoutSession> {
  if (provider === "xendit") {
    const invoice = await createInvoice({
      externalId: input.externalId,
      amount: input.amountMinor,
      payerEmail: input.customerEmail,
      description: input.description,
      customer: {
        given_names: input.customerName,
        email: input.customerEmail,
        mobile_number: input.customerPhone,
      },
      items: input.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.unitPriceMinor,
      })),
      successRedirectUrl: input.successUrl,
      failureRedirectUrl: input.cancelUrl,
    });

    if (!invoice.id || invoice.external_id !== input.externalId || invoice.amount !== input.amountMinor || invoice.currency !== input.currency) throw new Error("Xendit invoice does not match checkout");

    return {
      provider: "xendit",
      sessionId: invoice.id,
      url: invoice.invoice_url,
      status: "PENDING",
      expiresAt: invoice.expiry_date ? new Date(invoice.expiry_date) : undefined,
    };
  }

  const session = await createCheckoutSession({
    externalId: input.externalId,
    amountMinor: input.amountMinor,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    items: input.items,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
  });

  if (!session.id || session.metadata?.externalId !== input.externalId || session.amount_total !== input.amountMinor || session.currency.toUpperCase() !== input.currency || session.livemode !== !isStripeTestMode()) throw new Error("Stripe session does not match checkout");

  return {
    provider: "stripe",
    sessionId: session.id,
    url: session.url ?? "",
    status: "PENDING",
    expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
  };
}

export function calculateAmountMinor(provider: Provider, amountIdr: number): number {
  if (provider === "stripe") {
    return idrToUsdCents(amountIdr);
  }
  return amountIdr;
}

export function resolveCurrency(provider: Provider): "IDR" | "USD" {
  return provider === "stripe" ? "USD" : "IDR";
}

export type { CreateCheckoutInput, CheckoutSession, Provider } from "./types";
