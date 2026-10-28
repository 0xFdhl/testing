import "server-only";

export class XenditError extends Error {
  readonly statusCode?: number;
  readonly userMessage: string;

  constructor(
    message: string,
    options?: { statusCode?: number; userMessage?: string },
  ) {
    super(message);
    this.name = "XenditError";
    this.statusCode = options?.statusCode;
    this.userMessage =
      options?.userMessage ??
      "Gagal menghubungi gateway pembayaran. Coba lagi beberapa saat ya bro.";
  }
}

export function toCheckoutErrorMessage(err: unknown): string {
  if (err instanceof XenditError) return err.userMessage;

  // Do not expose deployment or credential configuration to shoppers.
  return "Gagal membuat invoice pembayaran. Coba lagi ya.";
}
