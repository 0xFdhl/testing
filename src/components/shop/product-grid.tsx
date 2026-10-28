"use client";
import { useMemo, useState } from "react";
import { CatalogFilter } from "@/components/shop/catalog-filter";
import { ProductCard } from "@/components/shop/product-card";
import {
  normalizeSearchQuery,
  type Product,
} from "@/lib/products";

type ProductGridProps = {
  initialCategory?: string;
  initialSearchQuery?: string;
  products: Product[];
};

export function ProductGrid({
  initialCategory = "all",
  initialSearchQuery = "",
  products,
}: ProductGridProps) {
  const [category, setCategory] = useState(initialCategory);
  const searchQuery = normalizeSearchQuery(initialSearchQuery);
  const categories = useMemo(
    () => [
      { value: "all", label: "all" },
      ...Array.from(new Set(products.map((product) => product.category)))
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value.toLowerCase() })),
    ],
    [products],
  );

  const filtered = useMemo(() => {
    const byCategory = products.filter(
      (product) => category === "all" || product.category === category,
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

  const sectionTitle = searchQuery ? `Results for "${searchQuery}"` : null;

  return (
    <>
      <CatalogFilter
        category={category}
        categories={categories}
        onCategoryChange={setCategory}
      />
      <section className="bg-white px-[5vw] pb-16 pt-[4vh] sm:pb-20 md:pb-24">
        {sectionTitle && (
          <h2 className="mb-6 text-sm font-medium tracking-tight text-black sm:mb-8 sm:text-base">
            {sectionTitle}
          </h2>
        )}
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-black/50">
            {searchQuery
              ? `No products found for "${searchQuery}". Try another search or filter.`
              : "No pieces in this category yet. Try another filter."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-14">
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
