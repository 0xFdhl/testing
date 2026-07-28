"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { formatIdr } from "@/lib/format";
import {
  MAX_SEARCH_QUERY_LENGTH,
  normalizeSearchQuery,
} from "@/lib/products";
import { cn } from "@/lib/utils";

type SearchProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  badge: string | null;
};

type NavSearchProps = {
  open: boolean;
  onClose: () => void;
  isLight: boolean;
};

export function NavSearch({ open, onClose, isLight }: NavSearchProps) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<SearchProduct[]>([]);

  useEffect(() => {
    if (open && allProducts.length === 0) {
      fetch("/api/products")
        .then((res) => res.json())
        .then(setAllProducts)
        .catch(() => {});
    }
  }, [open, allProducts.length]);

  const normalizedQuery = useMemo(() => normalizeSearchQuery(query), [query]);

  const results = useMemo(() => {
    if (!normalizedQuery || allProducts.length === 0) return [];
    const terms = normalizedQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return allProducts.filter((product) => {
      const haystack = [
        product.name,
        product.slug,
        product.category,
        product.description,
        product.badge ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [normalizedQuery, allProducts]);

  const handleClose = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value.slice(0, MAX_SEARCH_QUERY_LENGTH));
    },
    [],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!normalizedQuery) return;

      if (results.length === 1) {
        router.push(`/shop/${results[0].slug}`);
        handleClose();
        return;
      }

      const params = new URLSearchParams({ q: normalizedQuery });
      router.push(`/shop?${params.toString()}`);
      handleClose();
    },
    [handleClose, normalizedQuery, results, router],
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleClose, open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            onClick={handleClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${inputId}-label`}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed inset-x-0 top-[calc(var(--navbar-height)+env(safe-area-inset-top))] z-[90] border-b px-4 py-4 shadow-lg sm:px-6 md:top-[calc(var(--navbar-height-md)+env(safe-area-inset-top))] md:px-12 lg:px-16",
              isLight
                ? "border-black/10 bg-white text-black"
                : "border-white/10 bg-[#0A0A0A] text-white",
            )}
          >
            <div className="mx-auto max-w-[1600px]">
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <label htmlFor={inputId} id={`${inputId}-label`} className="sr-only">
                  Search products
                </label>
                <input
                  ref={inputRef}
                  id={inputId}
                  type="search"
                  name="q"
                  value={query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  placeholder="Search products..."
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={MAX_SEARCH_QUERY_LENGTH}
                  className={cn(
                    "min-w-0 flex-1 border-b bg-transparent py-2 text-sm tracking-wide outline-none placeholder:opacity-45 focus-visible:ring-2 focus-visible:ring-offset-2",
                    isLight
                      ? "border-black/20 focus:border-black/50 focus-visible:ring-black focus-visible:ring-offset-white"
                      : "border-white/20 focus:border-white/50 focus-visible:ring-white focus-visible:ring-offset-[#0A0A0A]",
                  )}
                />
                <button
                  type="submit"
                  disabled={!normalizedQuery}
                  className={cn(
                    "shrink-0 rounded-sm text-[11px] font-semibold tracking-[0.22em] uppercase transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    isLight
                      ? "focus-visible:ring-black focus-visible:ring-offset-white"
                      : "focus-visible:ring-white focus-visible:ring-offset-[#0A0A0A]",
                    normalizedQuery ? "opacity-100" : "opacity-35",
                  )}
                >
                  Search
                </button>
              </form>

              {normalizedQuery && (
                <div className="mt-4 max-h-[min(50vh,20rem)] overflow-y-auto">
                  {results.length === 0 ? (
                    <p className="py-6 text-sm opacity-50">
                      No products found for &ldquo;{normalizedQuery}&rdquo;.
                    </p>
                  ) : (
                    <ul className="divide-y divide-current/10">
                      {results.map((product) => (
                        <li key={product.id}>
                          <Link
                            href={`/shop/${product.slug}`}
                            onClick={handleClose}
                            className="flex items-center gap-4 rounded-sm py-3 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                          >
                            <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-neutral-200">
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {product.name}
                              </p>
                              <p className="text-xs opacity-55">
                                {formatIdr(product.price)}
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
