import { isPublicXenditTestMode } from "@/lib/xendit/public";

export function XenditTestBanner() {
  if (!isPublicXenditTestMode()) return null;

  return (
    <div
      role="status"
      className="rounded-md border border-violet-500/35 bg-violet-50 px-4 py-3 text-sm text-violet-950"
    >
      <p className="font-semibold">Xendit Test Mode (Sandbox)</p>
      <p className="mt-1 leading-relaxed opacity-85">
        Semua transaksi simulasi — no real money. Pakai tombol simulasi di halaman
        bayar Xendit untuk test success / failed / pending.
      </p>
    </div>
  );
}
