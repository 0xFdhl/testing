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

  if (err instanceof Error) {
    if (err.message.includes("is not configured")) {
      return (
        "Payment gateway belum dikonfigurasi. Buat file .env.local di root project, " +
        "copy isi dari .env.example, lalu isi secret key yang sesuai. " +
        "Restart dev server setelah simpan."
      );
    }
  }

  return "Gagal membuat invoice pembayaran. Coba lagi ya.";
}
