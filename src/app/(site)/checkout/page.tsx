import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/next-auth";
import { markOrderCancelledIfPending } from "@/actions/checkout";
import { CartCheckoutForm } from "@/components/checkout/cart-checkout-form";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Navbar } from "@/components/layout/navbar";
import { getProductBySlug } from "@/lib/products/db";
import {
  displaySizes,
  isSizeAvailable,
  type DisplaySize,
} from "@/lib/products";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
    slug?: string;
    size?: string;
    qty?: string;
    from?: string;
    failed?: string;
    order?: string;
  }>;
};

function parseSize(size: string | undefined): DisplaySize | undefined {
  if (!size) return undefined;
  return displaySizes.includes(size as DisplaySize)
    ? (size as DisplaySize)
    : undefined;
}

function parseQty(qty: string | undefined): number {
  const n = Number(qty);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), 10);
}

export default async function CheckoutPage({ searchParams }: Props) {
  const { slug, size: sizeParam, qty, from, failed, order: orderId } =
    await searchParams;

  const session = await auth();
  if (!session?.user?.id) {
    const p = new URLSearchParams();
    if (slug) p.set("slug", slug);
    if (sizeParam) p.set("size", sizeParam);
    if (qty) p.set("qty", qty);
    if (from) p.set("from", from);
    const qs = p.toString();
    redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout${qs ? `?${qs}` : ""}`)}`);
  }

  const showPaymentFailed = failed === "1";

  if (showPaymentFailed && orderId && session?.user?.id) {
    await markOrderCancelledIfPending(orderId, session.user.id);
  }

  if (from === "cart") {
    return (
      <main id="main-content" className="min-h-screen bg-white">
        <Navbar variant="solid" layout="shop" />
        <div className="mx-auto max-w-xl px-5 pt-28 pb-20 md:px-10 md:pt-32 lg:max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-black/45 uppercase">
            Checkout
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-black lowercase">
            selesaikan order lo
          </h1>
          <div className="mt-10">
            <CartCheckoutForm showPaymentFailed={showPaymentFailed} />
          </div>
        </div>
      </main>
    );
  }

  if (!slug) {
    return (
      <main id="main-content" className="min-h-screen bg-white">
        <Navbar variant="solid" layout="shop" />
        <div className="mx-auto max-w-xl px-5 pt-28 pb-20 md:px-10 md:pt-32 lg:max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-black/45 uppercase">
            Checkout
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-black">
            Pilih produk dulu
          </h1>
          <p className="mt-3 text-sm text-black/55">
            Belum ada item di checkout. Mulai dari katalog shop.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex h-11 items-center rounded-md bg-black px-6 text-sm font-medium text-white lowercase"
          >
            ke shop
          </Link>
        </div>
      </main>
    );
  }

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const requestedSize = parseSize(sizeParam);
  const defaultSize =
    requestedSize && isSizeAvailable(product, requestedSize)
      ? requestedSize
      : (displaySizes.find((s) => isSizeAvailable(product, s)) ?? "M");

  const defaultQty = parseQty(qty);

  return (
    <main id="main-content" className="min-h-screen bg-white">
      <Navbar variant="solid" layout="shop" />
      <div className="mx-auto max-w-xl px-5 pt-28 pb-20 md:px-10 md:pt-32 lg:max-w-2xl">
        <p className="text-[11px] font-semibold tracking-[0.25em] text-black/45 uppercase">
          Checkout
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-black lowercase">
          selesaikan order lo
        </h1>

        <div className="mt-10">
          <CheckoutForm
            product={product}
            initialSize={defaultSize}
            initialQuantity={defaultQty}
            showPaymentFailed={showPaymentFailed}
          />
        </div>
      </div>
    </main>
  );
}
