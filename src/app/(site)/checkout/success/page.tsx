import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PaymentStatus } from "@/components/checkout/payment-status";
import { Navbar } from "@/components/layout/navbar";
import { auth } from "@/lib/next-auth";
import { getCheckoutOrder } from "@/actions/checkout";

export const metadata: Metadata = {
  title: "Payment Status",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ order?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { order: externalId } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/checkout/success")}`);
  }

  if (!externalId) {
    return (
      <main id="main-content" className="min-h-screen bg-white">
        <Navbar variant="solid" layout="shop" />
        <div className="mx-auto max-w-xl px-5 pt-28 pb-20 md:px-10 md:pt-32 lg:max-w-2xl">
          <h1 className="text-2xl font-bold text-black">Order tidak ditemukan</h1>
          <p className="mt-3 text-sm text-black/55">
            Link status pembayaran tidak valid.
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

  const order = await getCheckoutOrder(externalId, session.user.id);

  if (!order) {
    return (
      <main id="main-content" className="min-h-screen bg-white">
        <Navbar variant="solid" layout="shop" />
        <div className="mx-auto max-w-xl px-5 pt-28 pb-20 md:px-10 md:pt-32 lg:max-w-2xl">
          <h1 className="text-2xl font-bold text-black">Order tidak ditemukan</h1>
          <p className="mt-3 text-sm text-black/55">
            Order <span className="font-mono text-xs">{externalId}</span> tidak
            ada di sistem. Kalau baru bayar, tunggu beberapa detik lalu refresh.
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

  return (
    <main id="main-content" className="min-h-screen bg-white">
      <Navbar variant="solid" layout="shop" />
      <div className="mx-auto max-w-xl px-5 pt-28 pb-20 md:px-10 md:pt-32 lg:max-w-2xl">
        <p className="text-[11px] font-semibold tracking-[0.25em] text-black/45 uppercase">
          Payment
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-black lowercase">
          status pembayaran
        </h1>
        <div className="mt-10">
          <PaymentStatus order={order} />
        </div>
      </div>
    </main>
  );
}
