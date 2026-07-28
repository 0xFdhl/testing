"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { ProductInfoAccordions } from "@/components/shop/product-info-tabs";
import { formatIdr } from "@/lib/format";
import {
  displaySizes,
  isSizeAvailable,
  type DisplaySize,
  type Product,
} from "@/lib/products";
import { cn } from "@/lib/utils";

export interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const defaultSize = useMemo(() => {
    if (product.badge === "CUSTOM ORDER") return "XS" as DisplaySize;
    const available = displaySizes.find((size) =>
      isSizeAvailable(product, size),
    );
    return available ?? "M";
  }, [product]);

  const [selectedSize, setSelectedSize] = useState<DisplaySize>(defaultSize);
  const [openAccordion, setOpenAccordion] = useState<"description" | "sizing" | "shipping" | null>(null);
  const { addItem } = useCart();
  const prefersReducedMotion = useReducedMotion();

  const handleAddToCart = () => {
    addItem({
      productSlug: product.slug,
      productName: product.name,
      size: selectedSize,
      price: product.price,
      image: product.image,
    });
  };

  return (
    <section className="mx-auto grid min-h-[calc(100svh-var(--navbar-height))] max-w-[1600px] grid-cols-1 content-center gap-8 px-4 py-8 sm:px-5 sm:py-10 md:min-h-[calc(100svh-var(--navbar-height-md))] md:grid-cols-12 md:gap-6 md:px-10 md:py-12 lg:gap-10 lg:px-14">

      {/* Kiri — judul, harga & deskripsi */}
      <div className="flex flex-col justify-center md:col-span-3 lg:col-span-3">
        <h1 className="text-left font-sans leading-[1.1] text-black">
          {product.badge && (
            <span className="mb-2 block text-lg font-bold tracking-tight uppercase md:text-xl">
              ({product.badge})
            </span>
          )}
          <span className="block text-3xl font-bold tracking-tight uppercase sm:text-4xl md:text-[2.75rem] lg:text-5xl">
            {product.name}
          </span>
        </h1>

        <p className="mt-6 text-xl font-bold tracking-tight text-black sm:text-2xl md:mt-8 md:text-[1.65rem]">
          {formatIdr(product.price)}
        </p>

        {/* ✅ Deskripsi produk */}
        {product.description && (
          <p className="mt-4 text-sm leading-relaxed text-black/60">
            {product.description}
          </p>
        )}
      </div>

      {/* Tengah — gambar produk */}
      <div className="relative flex items-center justify-center md:col-span-6 lg:col-span-6">
        <div className="relative aspect-[3/4] w-full max-w-[380px] bg-white sm:max-w-[420px] md:max-w-[400px] lg:max-w-[440px]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority
            className="object-contain object-center"
            sizes="(max-width: 768px) 80vw, 35vw"
          />
        </div>
      </div>

      {/* Kanan — size, CTA, accordions */}
      <div className="flex flex-col justify-center md:col-span-3 lg:col-span-3">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <p className="text-xs font-medium tracking-[0.14em] text-black uppercase sm:text-sm">
              Size
            </p>
            <button
              type="button"
              onClick={() =>
                setOpenAccordion((current) =>
                  current === "sizing" ? null : "sizing",
                )
              }
              className="rounded-sm text-[clamp(11px,1vw+8px,12px)] font-medium tracking-[0.16em] text-black uppercase transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Size guide
            </button>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 sm:gap-x-8">
            {displaySizes.map((size) => {
              const available = isSizeAvailable(product, size);
              const active = selectedSize === size;

              return (
                <button
                  key={size}
                  type="button"
                  disabled={!available}
                  onClick={() => available && setSelectedSize(size)}
                  className={cn(
                    "relative rounded-sm pb-1 text-sm font-medium tracking-wide uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:text-base",
                    active && available && "text-black",
                    !active && available && "text-black/40 hover:text-black/70",
                    !available && "cursor-not-allowed text-black/20",
                  )}
                >
                  {size}
                  {active && available && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-[2px] bg-black"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <motion.button
          type="button"
          onClick={handleAddToCart}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="mt-8 flex w-full items-center justify-center gap-2.5 border border-black bg-white px-6 py-3.5 text-xs font-medium tracking-[0.14em] text-black uppercase transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:mt-10 sm:text-sm"
        >
          <span className="relative inline-flex">
            <ShoppingBag className="h-4 w-4 stroke-[1.5]" aria-hidden />
            <Plus
              className="absolute -right-1.5 -bottom-1 h-2 w-2 stroke-[3]"
              aria-hidden
            />
          </span>
          Add to cart
        </motion.button>

        <ProductInfoAccordions
          product={product}
          openSection={openAccordion}
          onOpenSectionChange={setOpenAccordion}
        />
      </div>
    </section>
  );
}