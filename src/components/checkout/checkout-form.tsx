"use client";

import Image from "next/image";
import { useActionState, useEffect } from "react";
import {
  createCheckoutOrder,
  type CheckoutActionState,
} from "@/actions/checkout";
import { formatIdr } from "@/lib/format";
import type { DisplaySize, Product } from "@/lib/products";
import { cn } from "@/lib/utils";
import { PaymentMethodsNote } from "./payment-methods-note";
import { XenditTestBanner } from "./xendit-test-banner";

const initialState: CheckoutActionState = { ok: false };

type CheckoutFormProps = {
  product: Product;
  initialSize: DisplaySize;
  initialQuantity?: number;
  showPaymentFailed?: boolean;
};

export function CheckoutForm({
  product,
  initialSize,
  initialQuantity = 1,
  showPaymentFailed = false,
}: CheckoutFormProps) {
  const [state, formAction, isPending] = useActionState(
    createCheckoutOrder,
    initialState,
  );

  useEffect(() => {
    if (state.ok && state.redirectUrl) {
      window.location.href = state.redirectUrl;
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="productSlug" value={product.slug} />
      <input type="hidden" name="size" value={initialSize} />

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

      <div className="flex gap-5 border-b border-black/10 pb-8">
        <div className="relative h-28 w-24 shrink-0 bg-white">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain"
            sizes="96px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-black/45 uppercase">
            Order summary
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-black uppercase">
            {product.name}
          </h2>
          <p className="mt-1 text-sm text-black/55">
            Size {initialSize}
            {product.badge ? ` · ${product.badge}` : ""}
          </p>
          <p className="mt-2 text-xl font-bold text-black">
            {formatIdr(product.price)}
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="quantity"
          className="mb-2 block text-sm font-medium text-black"
        >
          Jumlah
        </label>
        <select
          id="quantity"
          name="quantity"
          defaultValue={String(initialQuantity)}
          disabled={isPending}
          className="w-full max-w-[8rem] rounded-md border border-black/20 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

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
    </form>
  );
}

type FieldProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  disabled?: boolean;
  errors?: string[];
};

function Field({
  id,
  name,
  label,
  placeholder,
  type = "text",
  disabled,
  errors,
}: FieldProps) {
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
