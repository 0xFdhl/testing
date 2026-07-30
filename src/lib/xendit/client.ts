import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getXenditSecretKey, getXenditWebhookToken } from "./config";
import { XenditError } from "./errors";
import { INDONESIA_INVOICE_PAYMENT_METHODS } from "./payment-methods";
import {
  XENDIT_API_BASE,
  type CreateInvoiceInput,
  type XenditInvoice,
  type XenditInvoiceStatus,
} from "./types";

function authHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function parseXenditError(res: Response): Promise<XenditError> {
  const body = await res.text();
  let userMessage = "Gateway pembayaran menolak request. Coba lagi ya.";

  if (res.status === 401) {
    userMessage =
      "API Key Xendit tidak valid. Pastikan pakai Test Secret Key di .env (bukan Live).";
  } else if (res.status === 400) {
    userMessage = "Data pembayaran tidak valid. Periksa jumlah dan detail order.";
  }

  return new XenditError(`Xendit API ${res.status}: ${body}`, {
    statusCode: res.status,
    userMessage,
  });
}

export function isPaidStatus(status: XenditInvoiceStatus): boolean {
  return status === "PAID" || status === "SETTLED";
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<XenditInvoice> {
  const secretKey = getXenditSecretKey();
  const paymentMethods =
    input.paymentMethods ?? INDONESIA_INVOICE_PAYMENT_METHODS;

  const res = await fetch(`${XENDIT_API_BASE}/v2/invoices`, {
    method: "POST",
    headers: {
      Authorization: authHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: input.externalId,
      amount: input.amount,
      payer_email: input.payerEmail,
      description: input.description,
      customer: input.customer,
      items: input.items,
      success_redirect_url: input.successRedirectUrl,
      failure_redirect_url: input.failureRedirectUrl,
      currency: "IDR",
      invoice_duration: input.invoiceDurationSeconds ?? 86_400,
      payment_methods: [...paymentMethods],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseXenditError(res);
  }

  return res.json() as Promise<XenditInvoice>;
}

export async function getInvoice(invoiceId: string): Promise<XenditInvoice> {
  const secretKey = getXenditSecretKey();

  const res = await fetch(`${XENDIT_API_BASE}/v2/invoices/${invoiceId}`, {
    headers: { Authorization: authHeader(secretKey) },
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseXenditError(res);
  }

  return res.json() as Promise<XenditInvoice>;
}

/**
 * Verifikasi webhook Invoice via x-callback-token (verification token di Dashboard).
 * Test & Live punya token berbeda — otomatis pakai yang sesuai XENDIT_MODE.
 */
export function verifyWebhookToken(req: Request): boolean {
  const webhookToken = getXenditWebhookToken();
  if (!webhookToken) return false;

  const header = req.headers.get("x-callback-token");
  if (!header) return false;

  const a = Buffer.from(header);
  const b = Buffer.from(webhookToken);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
