import "server-only";
import { createInvoice, getInvoice, isPaidStatus } from "@/lib/xendit";
import { createCheckoutSession, getSession } from "@/lib/stripe";
import { idrToUsdCents } from "./currency";
import type {
  CreateCheckoutInput,
  CheckoutSession,
  Provider,
  ProviderStatus,
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

  return {
    provider: "stripe",
    sessionId: session.id,
    url: session.url ?? "",
    status: "PENDING",
    expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
  };
}

export async function getProviderStatus(
  provider: Provider,
  gatewayId: string,
): Promise<ProviderStatus> {
  if (provider === "xendit") {
    const invoice = await getInvoice(gatewayId);
    if (isPaidStatus(invoice.status)) return "PAID";
    if (invoice.status === "EXPIRED") return "EXPIRED";
    return "PENDING";
  }

  const session = await getSession(gatewayId);
  if (session.payment_status === "paid") return "PAID";
  if (session.status === "expired") return "EXPIRED";
  return "PENDING";
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

export type { CreateCheckoutInput, CheckoutSession, Provider, ProviderStatus } from "./types";
