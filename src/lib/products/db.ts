import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { normalizeSearchQuery } from "./helpers";
import type {
  Product,
  ProductCategory,
  ProductSize,
  ProductColor,
} from "./types";

const DEFAULT_COLORS: ProductColor[] = [
  { id: "black", className: "bg-black", label: "Black" },
  { id: "grey", className: "bg-neutral-400", label: "Grey" },
  { id: "white", className: "bg-white ring-1 ring-black/10", label: "White" },
];

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  images: string[];
  sizes: unknown;
  badge: string | null;
  colorLabel: string | null;
  fitNote: string | null;
  sizingInfo: string[];
  shippingInfo: string[];
  returnsInfo: string[];
  createdAt: Date;
  updatedAt: Date;
};

function mapDbProduct(p: DbProduct): Product {
  const sizes = Array.isArray(p.sizes) ? (p.sizes as ProductSize[]) : [];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    badge: p.badge ?? undefined,
    category: p.category as ProductCategory,
    sizes,
    image: p.images[0] ?? "/images/placeholder.svg",
    imagePosition: "object-center",
    colors: DEFAULT_COLORS,
    price: p.price,
    description: p.description || undefined,
    colorLabel: p.colorLabel ?? undefined,
    fitNote: p.fitNote ?? undefined,
    sizingInfo: p.sizingInfo.length > 0 ? p.sizingInfo : undefined,
    shippingInfo: p.shippingInfo.length > 0 ? p.shippingInfo : undefined,
    returnsInfo: p.returnsInfo.length > 0 ? p.returnsInfo : undefined,
  };
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  const p = await prisma.product.findUnique({ where: { slug } });
  return p ? mapDbProduct(p as unknown as DbProduct) : undefined;
}

export async function getAllProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  return (products as unknown as DbProduct[]).map(mapDbProduct);
}

export async function searchProducts(
  query: string,
): Promise<Product[]> {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: normalized, mode: "insensitive" } },
        { slug: { contains: normalized, mode: "insensitive" } },
        { category: { contains: normalized, mode: "insensitive" } },
        { description: { contains: normalized, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  return (products as unknown as DbProduct[]).map(mapDbProduct);
}

export async function getRelatedProducts(
  slug: string,
  limit = 3,
): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { slug: { not: slug } },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
  return (products as unknown as DbProduct[]).map(mapDbProduct);
}

export const getNewArrivals = unstable_cache(
  async (): Promise<Product[]> => {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return (products as unknown as DbProduct[]).map(mapDbProduct);
  },
  ["new-arrivals"],
  { revalidate: 60, tags: ["products"] },
);
