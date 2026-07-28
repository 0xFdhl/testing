"use client";

import { motion } from "framer-motion";
import { shopCategoryFilters, type ShopFilterCategory } from "@/lib/products";
import { cn } from "@/lib/utils";

type CatalogFilterProps = {
  category: ShopFilterCategory;
  onCategoryChange: (value: ShopFilterCategory) => void;
};

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "shrink-0 rounded-full border px-5 py-2 text-xs font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white md:px-6 md:py-2.5 md:text-[13px]",
        active
          ? "border-black bg-black text-white"
          : "border-black/25 bg-white text-black hover:border-black/50",
      )}
    >
      {label}
    </motion.button>
  );
}

export function CatalogFilter({
  category,
  onCategoryChange,
}: CatalogFilterProps) {
  return (
    <section className="bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-5 sm:px-6 sm:py-6 md:flex-row md:items-center md:gap-8 md:px-12 md:py-7 lg:px-16">
        <span className="shrink-0 text-xs font-bold tracking-[0.2em] text-black uppercase sm:text-sm">
          FILTER
        </span>
        <div className="flex flex-1 gap-2.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:gap-3 [&::-webkit-scrollbar]:hidden">
          {shopCategoryFilters.map((item) => (
            <FilterPill
              key={item.value}
              label={item.label}
              active={category === item.value}
              onClick={() => onCategoryChange(item.value)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
