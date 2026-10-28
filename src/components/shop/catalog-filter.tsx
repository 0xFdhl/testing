"use client";

import { cn } from "@/lib/utils";

type CatalogFilterProps = {
  category: string;
  categories: { value: string; label: string }[];
  onCategoryChange: (value: string) => void;
};

export function CatalogFilter({
  category,
  categories,
  onCategoryChange,
}: CatalogFilterProps) {
  return (
    <section className="border-b border-black/[0.035] bg-white">
      <div className="mx-auto flex max-w-[1800px] flex-row items-center gap-5 px-[5vw] py-3 sm:gap-7 sm:py-4 md:gap-8">
        <span className="shrink-0 text-[12px] font-medium tracking-[-0.04em] text-black sm:text-[13px]">
          FILTER
        </span>
        <nav aria-label="Filter catalog by category" className="flex items-center gap-5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-7 md:gap-8">
          {categories.map((item) => {
            const isActive = category === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onCategoryChange(item.value)}
                className={cn(
                  "relative shrink-0 whitespace-nowrap px-0 py-1 text-[12px] font-normal tracking-[-0.04em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:text-[13px]",
                  isActive
                    ? "text-black after:absolute after:inset-x-0 after:-bottom-[2px] after:h-px after:bg-black"
                    : "text-black/35 hover:text-black/70",
                )}
              >
                {item.label.toLowerCase()}
              </button>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
