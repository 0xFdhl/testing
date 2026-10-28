import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { ProductGrid } from "@/components/shop/product-grid";
import { ShopBanner } from "@/components/shop/shop-banner";
import { getAllProducts } from "@/lib/products/db";
import { normalizeSearchQuery } from "@/lib/products";

export const metadata: Metadata = {
  title: "Catalog — All Products",
  description: "Browse the full varcasvi_ collection.",
};

type ShopPageProps = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const initialSearchQuery =
    typeof params.q === "string" ? normalizeSearchQuery(params.q) : "";
  const allProducts = await getAllProducts();
  const requestedCategory = params.category;
  const initialCategory =
    requestedCategory === "all" ||
    allProducts.some((product) => product.category === requestedCategory)
      ? requestedCategory ?? "all"
      : "all";

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
