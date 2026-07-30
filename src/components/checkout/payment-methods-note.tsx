import { PAYMENT_METHOD_LABELS } from "@/lib/xendit/payment-methods";

const DISPLAY_ORDER = Object.values(PAYMENT_METHOD_LABELS);

export function PaymentMethodsNote() {
  return (
    <div className="rounded-md border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/65">
      <p className="font-medium text-black/80">Metode pembayaran tersedia</p>
      <p className="mt-2 leading-relaxed">
        {DISPLAY_ORDER.join(" · ")}
      </p>
      <p className="mt-2 text-xs text-black/45">
        Hosted checkout Xendit — pilih method di halaman pembayaran setelah checkout.
      </p>
    </div>
  );
}
