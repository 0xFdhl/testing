"use client";

import { shopCategoryFilters, type ShopFilterCategory } from "@/lib/products";
import { cn } from "@/lib/utils";

type CatalogFilterProps = {
  category: ShopFilterCategory;
  onCategoryChange: (value: ShopFilterCategory) => void;
};

export function CatalogFilter({
  category,
  onCategoryChange,
}: CatalogFilterProps) {
  return (
    <section className="bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-row items-center gap-3 px-4 py-4 sm:px-6 sm:py-6 md:gap-8 md:px-12 md:py-7 lg:px-16">
        <span className="shrink-0 text-[11px] font-bold tracking-[0.2em] text-black/50 uppercase sm:text-xs">
          FILTER
        </span>
        <nav className="flex flex-1 items-center gap-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {shopCategoryFilters.map((item) => {
            const isActive = category === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onCategoryChange(item.value)}
                className={cn(
                  "relative shrink-0 border-b-2 px-4 py-2 text-sm font-medium tracking-wide transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white md:px-5 md:text-[13px]",
                  isActive
                    ? "border-black text-black"
                    : "border-transparent text-black/40 hover:text-black/70",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
