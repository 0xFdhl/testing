import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { ProductDetail } from "@/components/shop/product-detail";
import { ProductJsonLd } from "@/components/shop/product-jsonld";
import { YouMayLike } from "@/components/shop/you-may-like";
import { getProductBySlug, getRelatedProducts } from "@/lib/products/db";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const products = await prisma.product.findMany({ select: { slug: true } });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product" };
  return { title: product.name };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const relatedProducts = await getRelatedProducts(slug);

  return (
    <main id="main-content" className="min-h-screen bg-white">
      <ProductJsonLd product={product} />
      <Navbar variant="solid" layout="shop" />
      <div className="pt-[var(--navbar-height)] md:pt-[var(--navbar-height-md)]">
        <ProductDetail product={product} />
        <YouMayLike products={relatedProducts} />
      </div>
    </main>
  );
}
