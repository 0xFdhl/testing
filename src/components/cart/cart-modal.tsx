"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatIdr } from "@/lib/format";
import { DURATION_FAST, DURATION_MODAL, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function CartModal() {
  const {
    items,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    subtotal,
  } = useCart();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isCartOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isCartOpen, closeCart]);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION_MODAL, ease: EASE_OUT }}
            className="absolute inset-0 bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            onClick={closeCart}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-modal-title"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 24, scale: 0.96 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 16, scale: 0.98 }
            }
            transition={{ duration: DURATION_MODAL, ease: EASE_OUT }}
            className="relative flex max-h-[min(80dvh,34rem)] w-[calc(100%-2rem)] max-w-md flex-col rounded-sm bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)] md:max-h-[min(80dvh,40rem)]"
          >
            <div className="flex items-center justify-between border-b border-black/8 px-5 py-4">
              <h2 id="cart-modal-title" className="text-lg font-bold text-black">
                Cart
              </h2>
              <motion.button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
                className="rounded-sm text-black/45 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DURATION_FAST, ease: EASE_OUT }}
                  className="py-10 text-center"
                >
                  <p className="text-sm text-black/45">Cart lo masih kosong bro.</p>
                  <Link
                    href="/shop"
                    onClick={closeCart}
                    className="mt-4 inline-block rounded-sm text-xs font-semibold tracking-[0.15em] text-black uppercase underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    Browse catalog
                  </Link>
                </motion.div>
              ) : (
                <motion.ul layout className="space-y-5">
                  <AnimatePresence initial={false} mode="popLayout">
                    {items.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={
                          prefersReducedMotion
                            ? false
                            : { opacity: 0, x: -12, height: 0 }
                        }
                        animate={{ opacity: 1, x: 0, height: "auto" }}
                        exit={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, x: 12, height: 0, marginBottom: 0 }
                        }
                        transition={{ duration: DURATION_FAST, ease: EASE_OUT }}
                        className="flex gap-3 overflow-hidden"
                      >
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
                          <p className="text-sm font-medium text-black lowercase">
                            {item.productName}
                          </p>
                          <p className="mt-1 text-sm text-black/70">
                            {formatIdr(item.price)}
                          </p>

                          <div className="mt-2 inline-flex h-8 items-stretch overflow-hidden rounded-sm bg-black text-white">
                            <motion.button
                              type="button"
                              aria-label="Decrease quantity"
                              whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="flex w-8 items-center justify-center transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </motion.button>
                            <motion.span
                              key={item.quantity}
                              initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.15, ease: EASE_OUT }}
                              className="flex min-w-[2rem] items-center justify-center text-xs font-semibold"
                            >
                              {item.quantity}
                            </motion.span>
                            <motion.button
                              type="button"
                              aria-label="Increase quantity"
                              disabled={item.quantity >= 10}
                              whileTap={
                                item.quantity < 10 && !prefersReducedMotion
                                  ? { scale: 0.9 }
                                  : undefined
                              }
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className={cn(
                                "flex w-8 items-center justify-center transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                                item.quantity >= 10 &&
                                  "cursor-not-allowed opacity-40",
                              )}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </motion.button>
                          </div>
                        </div>

                        <motion.button
                          type="button"
                          aria-label={`Remove ${item.productName}`}
                          whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
                          onClick={() => removeItem(item.id)}
                          className="shrink-0 self-start rounded-sm pt-0.5 text-black/35 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                        >
                          <X className="h-4 w-4" />
                        </motion.button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </div>

            <AnimatePresence>
              {items.length > 0 && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: DURATION_FAST, ease: EASE_OUT }}
                  className="border-t border-black/8 px-5 py-4"
                >
                  <div className="mb-4 flex items-center justify-between text-sm">
                    <span className="text-black/45">Subtotal</span>
                    <motion.span
                      key={subtotal}
                      initial={prefersReducedMotion ? false : { scale: 0.95 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.15 }}
                      className="font-semibold text-black"
                    >
                      {formatIdr(subtotal)}
                    </motion.span>
                  </div>
                  <motion.div whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}>
                    <Link
                      href="/checkout?from=cart"
                      onClick={closeCart}
                      className="flex h-11 w-full items-center justify-center rounded-sm bg-black text-sm font-medium text-white lowercase transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      checkout
                    </Link>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
