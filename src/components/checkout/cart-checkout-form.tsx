"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import {
  createCartCheckoutOrder,
  type CheckoutActionState,
} from "@/actions/checkout";
import { useCart } from "@/components/cart/cart-provider";
import { formatIdr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PaymentMethodsNote } from "./payment-methods-note";
import { XenditTestBanner } from "./xendit-test-banner";

const initialState: CheckoutActionState = { ok: false };

type CartCheckoutFormProps = {
  showPaymentFailed?: boolean;
};

export function CartCheckoutForm({
  showPaymentFailed = false,
}: CartCheckoutFormProps) {
  const { items, subtotal, clearCart } = useCart();
  const [state, formAction, isPending] = useActionState(
    createCartCheckoutOrder,
    initialState,
  );

  useEffect(() => {
    if (state.ok && state.redirectUrl) {
      clearCart();
      window.location.href = state.redirectUrl;
    }
  }, [state, clearCart]);

  if (items.length === 0) {
    return (
      <div>
        <p className="text-sm text-black/55">
          Cart kosong. Tambah produk dulu dari shop.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-black px-6 text-sm font-medium text-white lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          ke shop
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          items.map((item) => ({
            productSlug: item.productSlug,
            size: item.size,
            quantity: item.quantity,
          })),
        )}
      />

      {showPaymentFailed && (
        <div
          role="alert"
          className="rounded-md border border-amber-600/40 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Pembayaran belum selesai atau dibatalkan. Coba lagi ya bro.
        </div>
      )}

      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-red-600/30 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-4 border-b border-black/10 pb-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-black/45 uppercase">
          Order summary
        </p>
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="flex gap-4">
              <div className="relative h-20 w-16 shrink-0 bg-white">
                <Image
                  src={item.image}
                  alt={item.productName}
                  fill
                  className="object-contain"
                  sizes="64px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold tracking-tight text-black uppercase">
                  {item.productName}
                </p>
                <p className="mt-0.5 text-sm text-black/55">
                  Size {item.size} · Qty {item.quantity}
                </p>
                <p className="mt-1 font-semibold text-black">
                  {formatIdr(item.price * item.quantity)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-black/8 pt-4 text-sm">
          <span className="text-black/45">Total</span>
          <span className="text-lg font-bold text-black">
            {formatIdr(subtotal)}
          </span>
        </div>
      </div>

      <CheckoutFields state={state} isPending={isPending} />
    </form>
  );
}

function CheckoutFields({
  state,
  isPending,
}: {
  state: CheckoutActionState;
  isPending: boolean;
}) {
  return (
    <>
      <div className="space-y-5">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-black/45 uppercase">
          Data pembeli
        </p>

        <Field
          id="customerName"
          name="customerName"
          label="Nama lengkap"
          placeholder="Nama sesuai identitas"
          disabled={isPending}
          errors={state.fieldErrors?.customerName}
        />
        <Field
          id="customerEmail"
          name="customerEmail"
          type="email"
          label="Email"
          placeholder="email@contoh.com"
          disabled={isPending}
          errors={state.fieldErrors?.customerEmail}
        />
        <Field
          id="customerPhone"
          name="customerPhone"
          type="tel"
          label="No. WhatsApp / HP"
          placeholder="08123456789"
          disabled={isPending}
          errors={state.fieldErrors?.customerPhone}
        />
      </div>

      <XenditTestBanner />
      <PaymentMethodsNote />

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "h-12 w-full rounded-md bg-black text-sm font-medium tracking-wide text-white lowercase transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          isPending ? "cursor-wait opacity-70" : "hover:opacity-85",
        )}
      >
        {isPending ? "memproses..." : "lanjut ke pembayaran"}
      </button>
    </>
  );
}

function Field({
  id,
  name,
  label,
  placeholder,
  type = "text",
  disabled,
  errors,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  disabled?: boolean;
  errors?: string[];
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-black">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        required
        className={cn(
          "w-full rounded-md border bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          errors?.length
            ? "border-red-500 focus:border-red-600 focus-visible:ring-red-600"
            : "border-black/20 focus:border-black focus-visible:ring-black",
        )}
      />
      {errors?.map((msg) => (
        <p key={msg} className="mt-1.5 text-xs text-red-600">
          {msg}
        </p>
      ))}
    </div>
  );
}
