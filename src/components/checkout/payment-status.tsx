import Link from "next/link";
import { formatIdr } from "@/lib/format";
import type { Order } from "@/lib/orders";
import { isPublicXenditTestMode } from "@/lib/xendit/public";
import { cn } from "@/lib/utils";
import { XenditTestBanner } from "./xendit-test-banner";

type PaymentStatusProps = {
  order: Order;
};

const statusConfig = {
  PAID: {
    label: "Pembayaran berhasil",
    description:
      "Mantap bro! Order lo udah kami terima. Tim kami bakal hubungi untuk konfirmasi produksi.",
    tone: "success" as const,
  },
  PENDING: {
    label: "Menunggu pembayaran",
    description:
      "Invoice masih aktif. Selesaikan pembayaran lewat link Xendit atau refresh halaman ini.",
    tone: "pending" as const,
  },
  EXPIRED: {
    label: "Invoice kedaluwarsa",
    description:
      "Waktu pembayaran habis. Buat order baru dari halaman checkout ya.",
    tone: "expired" as const,
  },
  CANCELLED: {
    label: "Pembayaran dibatalkan",
    description:
      "Kamu keluar dari halaman bayar atau pembayaran gagal. Bisa checkout ulang kapan aja.",
    tone: "cancelled" as const,
  },
};

export function PaymentStatus({ order }: PaymentStatusProps) {
  const config = statusConfig[order.status];

  return (
    <div className="space-y-6">
      {isPublicXenditTestMode() && <XenditTestBanner />}

      <div
        className={cn(
          "rounded-md border px-5 py-4",
          config.tone === "success" &&
            "border-emerald-600/30 bg-emerald-50 text-emerald-950",
          config.tone === "pending" &&
            "border-amber-600/30 bg-amber-50 text-amber-950",
          config.tone === "expired" &&
            "border-red-600/30 bg-red-50 text-red-950",
          config.tone === "cancelled" &&
            "border-slate-500/30 bg-slate-50 text-slate-950",
        )}
      >
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-70">
          Status
        </p>
        <p className="mt-1 text-xl font-bold">{config.label}</p>
        <p className="mt-2 text-sm leading-relaxed opacity-80">
          {config.description}
        </p>
      </div>

      <dl className="space-y-4 border-t border-black/10 pt-6 text-sm">
        <Row label="Order ID" value={order.externalId} mono />
        {order.lineItems.map((item, index) => (
          <div
            key={`${item.productSlug}-${item.size}-${index}`}
            className="space-y-2 border-b border-black/5 pb-4 last:border-0"
          >
            <Row label="Produk" value={item.productName} />
            <Row label="Ukuran" value={item.size} />
            <Row label="Jumlah" value={String(item.quantity)} />
            <Row
              label="Subtotal"
              value={formatIdr(item.unitPrice * item.quantity)}
            />
          </div>
        ))}
        <Row label="Total" value={formatIdr(order.amount)} bold />
        <Row label="Nama" value={order.customerName} />
        <Row label="Email" value={order.customerEmail} />
      </dl>

      <div className="flex flex-wrap gap-3">
        {order.status === "PENDING" && order.invoiceUrl && (
          <a
            href={order.invoiceUrl}
            className="inline-flex h-11 items-center rounded-md bg-black px-6 text-sm font-medium text-white lowercase transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            buka halaman bayar
          </a>
        )}
        {(order.status === "EXPIRED" || order.status === "CANCELLED") && (
          <Link
            href={
              order.lineItems.length === 1
                ? `/checkout?slug=${order.lineItems[0].productSlug}&size=${order.lineItems[0].size}`
                : "/checkout?from=cart"
            }
            className="inline-flex h-11 items-center rounded-md bg-black px-6 text-sm font-medium text-white lowercase transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            checkout ulang
          </Link>
        )}
        <Link
          href="/shop"
          className="inline-flex h-11 items-center rounded-md border border-black/25 px-6 text-sm font-medium text-black transition-colors hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          kembali ke shop
        </Link>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  bold,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-black/45">{label}</dt>
      <dd
        className={cn(
          "text-right text-black",
          mono && "font-mono text-xs",
          bold && "font-bold",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
