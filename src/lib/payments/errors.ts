import "server-only";

export class PaymentError extends Error {
  readonly statusCode?: number;
  readonly userMessage: string;

  constructor(
    message: string,
    options?: { statusCode?: number; userMessage?: string },
  ) {
    super(message);
    this.name = "PaymentError";
    this.statusCode = options?.statusCode;
    this.userMessage =
      options?.userMessage ??
      "Gagal memproses pembayaran. Coba lagi beberapa saat.";
  }
}

export function toCheckoutErrorMessage(err: unknown): string {
  if (err instanceof PaymentError) return err.userMessage;

  // Configuration details belong in server logs, never in a shopper response.
  return "Gagal membuat invoice pembayaran. Coba lagi ya.";
}
