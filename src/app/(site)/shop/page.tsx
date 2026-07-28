import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { ProductGrid } from "@/components/shop/product-grid";
import { ShopBanner } from "@/components/shop/shop-banner";
import { getAllProducts } from "@/lib/products/db";
import { isValidShopFilterCategory, normalizeSearchQuery } from "@/lib/products";

export const metadata: Metadata = {
  title: "Catalog — All Products",
  description: "Browse tees and Levi's 529 Bootcut from yourbrand.",
};

type ShopPageProps = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const initialCategory = isValidShopFilterCategory(params.category)
    ? params.category
    : "all";
  const initialSearchQuery =
    typeof params.q === "string" ? normalizeSearchQuery(params.q) : "";
  const allProducts = await getAllProducts();

  return (
    <main id="main-content" className="min-h-screen bg-white pb-20 md:pb-0">
      <Navbar variant="solid" layout="shop" />
      <div className="pt-[var(--navbar-height)] md:pt-[var(--navbar-height-md)]">
        <ShopBanner />
        <ProductGrid
          key={`${initialCategory}-${initialSearchQuery}`}
          initialCategory={initialCategory}
          initialSearchQuery={initialSearchQuery}
          products={allProducts}
        />
      </div>
    </main>
  );
}
