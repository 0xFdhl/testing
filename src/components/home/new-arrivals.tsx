"use client";

import { useCallback, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import type { Product } from "@/lib/products";
import { NewArrivalCard } from "@/components/home/new-arrival-card";

type NewArrivalsProps = {
  products: Product[];
};

export function NewArrivals({ products }: NewArrivalsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const updateProgress = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setProgress(maxScroll > 0 ? el.scrollLeft / maxScroll : 1);
  }, []);

  return (
    <section className="flex flex-1 flex-col bg-white px-4 py-10 sm:px-6 sm:py-12 md:px-12 md:py-16 lg:px-16">
      <h2 className="mb-8 text-center text-sm font-bold italic tracking-[0.06em] text-black uppercase sm:mb-10 sm:text-base md:mb-12 md:text-lg">
        NEW ARRIVAL
      </h2>

      <div className="hidden gap-4 lg:grid lg:grid-cols-5 lg:gap-5">
        {products.map((product) => (
          <NewArrivalCard key={product.id} product={product} />
        ))}
      </div>

      <div
        ref={scrollRef}
        onScroll={updateProgress}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[72vw] max-w-[280px] shrink-0 snap-start sm:w-[42vw]"
          >
            <NewArrivalCard product={product} />
          </div>
        ))}
      </div>

      <div className="mx-auto mt-8 w-full max-w-[120px] lg:mx-0 lg:mt-10 lg:max-w-[200px]">
        <div className="h-px w-full bg-neutral-200">
          <div
            className="h-px w-full origin-left bg-black"
            style={{
              transform: `scaleX(${Math.max(0.2, progress)})`,
              transition: prefersReducedMotion ? "none" : "transform 150ms ease-out",
              willChange: "transform",
            }}
          />
        </div>
      </div>
    </section>
  );
}
