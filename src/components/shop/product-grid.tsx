"use client";
import { useMemo, useState } from "react";
import { CatalogFilter } from "@/components/shop/catalog-filter";
import { ProductCard } from "@/components/shop/product-card";
import {
  normalizeSearchQuery,
  productMatchesShopFilter,
  shopCategoryFilters,
  type Product,
  type ShopFilterCategory,
} from "@/lib/products";

type ProductGridProps = {
  initialCategory?: ShopFilterCategory;
  initialSearchQuery?: string;
  products: Product[];
};

export function ProductGrid({
  initialCategory = "all",
  initialSearchQuery = "",
  products,
}: ProductGridProps) {
  const [category, setCategory] = useState<ShopFilterCategory>(initialCategory);
  const searchQuery = normalizeSearchQuery(initialSearchQuery);

  const filtered = useMemo(() => {
    const byCategory = products.filter((product) =>
      productMatchesShopFilter(product, category),
    );
    if (!searchQuery) return byCategory;
    const q = searchQuery.toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    return byCategory.filter((product) => {
      const haystack = [
        product.name,
        product.slug,
        product.category,
        product.description ?? "",
        product.badge ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [category, searchQuery, products]);

  const sectionTitle = searchQuery
    ? `Results for "${searchQuery}"`
    : category === "all"
      ? "All Product"
      : shopCategoryFilters.find((filter) => filter.value === category)?.label ??
        "All Product";

  return (
    <>
      <CatalogFilter category={category} onCategoryChange={setCategory} />
      <section className="bg-white px-4 pb-16 pt-2 sm:px-6 md:px-12 md:pb-20 lg:px-16">
        <h2 className="mb-4 text-xs font-bold tracking-[0.2em] text-black uppercase sm:mb-6 sm:text-sm md:mb-8">
          {sectionTitle}
        </h2>
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-black/50">
            {searchQuery
              ? `No products found for "${searchQuery}". Try another search or filter.`
              : "No pieces in this category yet. Try another filter."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4 sm:gap-x-3 sm:gap-y-8 md:grid-cols-5 md:gap-x-3 lg:grid-cols-6 lg:gap-x-4">
            {filtered.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                variant="catalog"
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
