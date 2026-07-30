import "server-only";
import crypto from "node:crypto";
import { timingSafeEqual } from "node:crypto";
import { getStripeSecretKey, getStripeWebhookSecret } from "./config";
import { StripeError } from "./errors";
import { STRIPE_API_BASE, type StripeCheckoutSession } from "./types";

function authHeader(secretKey: string): string {
  return `Bearer ${secretKey}`;
}

async function parseStripeError(res: Response): Promise<StripeError> {
  let body: { error?: { message?: string; code?: string; type?: string } };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    body = {};
  }

  let userMessage = "Gateway pembayaran menolak request. Coba lagi ya.";

  if (res.status === 401) {
    userMessage = "API Key Stripe tidak valid. Periksa STRIPE_SECRET_KEY di .env.local.";
  } else if (res.status === 400) {
    userMessage = "Data pembayaran tidak valid. Periksa jumlah dan detail order.";
  }

  return new StripeError(
    `Stripe API ${res.status}: ${body?.error?.message ?? res.statusText}`,
    {
      statusCode: res.status,
      userMessage,
      stripeCode: body?.error?.code,
    },
  );
}

function buildLineItemsParams(
  items: Array<{ name: string; quantity: number; unitPriceMinor: number }>,
): Record<string, string> {
  const params: Record<string, string> = {};
  items.forEach((item, i) => {
    params[`line_items[${i}][price_data][currency]`] = "usd";
    params[`line_items[${i}][price_data][product_data][name]`] = item.name;
    params[`line_items[${i}][price_data][unit_amount]`] = String(item.unitPriceMinor);
    params[`line_items[${i}][quantity]`] = String(item.quantity);
  });
  return params;
}

export type CreateStripeSessionInput = {
  externalId: string;
  amountMinor: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  items: Array<{ name: string; quantity: number; unitPriceMinor: number }>;
  successUrl: string;
  cancelUrl: string;
};

export async function createCheckoutSession(
  input: CreateStripeSessionInput,
): Promise<StripeCheckoutSession> {
  const key = getStripeSecretKey();

  const body = new URLSearchParams({
    mode: "payment",
    "metadata[externalId]": input.externalId,
    "metadata[customerName]": input.customerName,
    "metadata[customerEmail]": input.customerEmail,
    "metadata[customerPhone]": input.customerPhone,
    "metadata[provider]": "stripe",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    ...buildLineItemsParams(input.items),
  });

  const res = await fetch(`${STRIPE_API_BASE}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: authHeader(key),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseStripeError(res);
  }

  return res.json() as Promise<StripeCheckoutSession>;
}

export async function getSession(sessionId: string): Promise<StripeCheckoutSession> {
  const key = getStripeSecretKey();

  const res = await fetch(`${STRIPE_API_BASE}/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: authHeader(key) },
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseStripeError(res);
  }

  return res.json() as Promise<StripeCheckoutSession>;
}

export function verifyWebhookSignature(req: Request, rawBody: string): boolean {
  const secret = getStripeWebhookSecret();
  const header = req.headers.get("stripe-signature");
  if (!header) return false;

  const parts = header.split(",");
  let timestamp = "";
  let signature = "";

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signature = value;
  }

  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret)
    .update(signedPayload)
    .digest();

  const actual = Buffer.from(signature, "hex");

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
