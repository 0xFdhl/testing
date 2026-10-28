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
    userMessage = "Gateway pembayaran tidak dapat diproses. Coba lagi beberapa saat.";
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
  const total = input.items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
  if (!input.items.length || input.items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || !Number.isSafeInteger(item.unitPriceMinor) || item.unitPriceMinor <= 0) || !Number.isSafeInteger(total) || total <= 0 || total !== input.amountMinor) {
    throw new Error("Stripe line items do not match the payment total");
  }
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
      "Idempotency-Key": input.externalId,
    },
    body: body.toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw await parseStripeError(res);
  }

  return res.json() as Promise<StripeCheckoutSession>;
}

export async function getSession(sessionId: string): Promise<StripeCheckoutSession> {
  const key = getStripeSecretKey();

  const res = await fetch(`${STRIPE_API_BASE}/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: authHeader(key) },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw await parseStripeError(res);
  }

  return res.json() as Promise<StripeCheckoutSession>;
}

export function verifyWebhookSignature(req: Request, rawBody: string): boolean {
  let secret: string;
  try { secret = getStripeWebhookSecret(); } catch { return false; }
  const header = req.headers.get("stripe-signature");
  if (!header) return false;

  const parts = header.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === "t") timestamp = value;
    if (key === "v1" && /^[a-f0-9]{64}$/i.test(value)) signatures.push(value);
  }

  if (!/^\d+$/.test(timestamp) || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret)
    .update(signedPayload)
    .digest();

  return signatures.some((signature) => timingSafeEqual(expected, Buffer.from(signature, "hex")));
}
