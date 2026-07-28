"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatIdr } from "@/lib/format";
import { DURATION_FAST, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function CartAddedToast() {
  const { addedItem, dismissAddedToast, openCart } = useCart();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!addedItem) return;
    const timer = window.setTimeout(() => dismissAddedToast(), 6000);
    return () => window.clearTimeout(timer);
  }, [addedItem, dismissAddedToast]);

  const checkoutHref = addedItem
    ? `/checkout?slug=${addedItem.productSlug}&size=${addedItem.size}&qty=${addedItem.quantity}`
    : "#";

  return (
    <AnimatePresence mode="wait">
      {addedItem && (
        <motion.div
          key={`${addedItem.id}-${addedItem.quantity}`}
          role="status"
          aria-live="polite"
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, x: 28, scale: 0.96 }
          }
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : { opacity: 1, x: 0, scale: 1 }
          }
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, x: 20, scale: 0.97 }
          }
          transition={{ duration: DURATION_FAST, ease: EASE_OUT }}
          className={cn(
            "fixed top-[calc(var(--navbar-height)+0.75rem)] right-4 z-[60] w-[min(100vw-2rem,22rem)]",
            "rounded-sm bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
            "md:top-[calc(var(--navbar-height-md)+1rem)] md:right-8",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-black/8 px-4 py-3">
            <p className="text-sm font-medium text-black">Product added to cart</p>
            <motion.button
              type="button"
              onClick={dismissAddedToast}
              aria-label="Close notification"
              whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
              className="rounded-sm text-black/45 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: DURATION_FAST, ease: EASE_OUT }}
            className="flex items-center gap-3 px-4 py-3"
          >
            <div className="relative h-14 w-12 shrink-0 bg-white">
              <Image
                src={addedItem.image}
                alt={addedItem.productName}
                fill
                className="object-contain"
                sizes="48px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-black lowercase">
                {addedItem.productName}
              </p>
              <p className="mt-0.5 text-xs text-black/55">
                {formatIdr(addedItem.price)}
              </p>
            </div>
            <p className="shrink-0 text-xs text-black/45">
              - x{addedItem.quantity}
            </p>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: DURATION_FAST, ease: EASE_OUT }}
            className="flex gap-2 px-4 pb-4"
          >
            <motion.div className="flex-1" whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}>
              <Link
                href={checkoutHref}
                onClick={dismissAddedToast}
                className="flex h-9 w-full items-center justify-center rounded-sm bg-black text-xs font-medium text-white lowercase transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                buy now
              </Link>
            </motion.div>
            <motion.button
              type="button"
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              onClick={() => {
                dismissAddedToast();
                openCart();
              }}
              className="flex h-9 flex-1 items-center justify-center rounded-sm bg-black text-xs font-medium text-white lowercase transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              view cart
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
