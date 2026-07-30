import "server-only";

export class StripeError extends Error {
  readonly statusCode?: number;
  readonly userMessage: string;
  readonly stripeCode?: string;

  constructor(
    message: string,
    options?: { statusCode?: number; userMessage?: string; stripeCode?: string },
  ) {
    super(message);
    this.name = "StripeError";
    this.statusCode = options?.statusCode;
    this.userMessage =
      options?.userMessage ??
      "Gateway pembayaran menolak request. Coba lagi ya.";
    this.stripeCode = options?.stripeCode;
  }
}
