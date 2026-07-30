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

  if (err instanceof Error) {
    if (err.message.includes("is not configured")) {
      return (
        "Payment gateway belum dikonfigurasi. Buat file .env.local di root project, " +
        "copy isi dari .env.example, lalu isi XENDIT_TEST_SECRET_KEY dari Xendit Dashboard " +
        "(Settings → API Keys → Test). Restart dev server setelah simpan."
      );
    }
  }

  return "Gagal membuat invoice pembayaran. Coba lagi ya.";
}
