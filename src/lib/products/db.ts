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

export const SOURCE_PRODUCTS: Product[] = [
  {
    id: "source-ada-wong",
    slug: "ada-wong-double-layer-longsleeve",
    name: "Ada Wong — Double Layer Longsleeve",
    category: "jacket",
    sizes: ["M", "L", "XL"],
    image: "/products/varcasvi/Ada%20wong%20-%20Longsleeve%20double%20layer%20sleeve.webp",
    price: 299_000,
    description: "Double layer longsleeve. Product details and price are temporary.",
  },
  {
    id: "source-jill-valentine",
    slug: "jill-valentine-fireman-claps-jacket",
    name: "Jill Valentine — Fire Man Claps Jacket",
    category: "jacket",
    sizes: ["M", "L", "XL"],
    image: "/products/varcasvi/Fire%20man%20claps%20jacket%20-%20Jill%20valentine%20.webp",
    price: 399_000,
    description: "Fire Man Claps jacket. Product details and price are temporary.",
  },
  {
    id: "source-misa-amane",
    slug: "misa-amane-double-layer-sleeve",
    name: "Misa Amane — Double Layer Sleeve",
    category: "jacket",
    sizes: ["M", "L", "XL"],
    image: "/products/varcasvi/Misa%20amane%20-%20double%20layer%20sleeve.webp",
    price: 299_000,
    description: "Double layer sleeve. Product details and price are temporary.",
  },
  {
    id: "source-nana-ren",
    slug: "nana-ren-tees-fit",
    name: "Nana Ren — Tees Fit",
    category: "jacket",
    sizes: ["M", "L", "XL"],
    image: "/products/varcasvi/Nana%20ren%20-%20tees%20fit.webp",
    price: 199_000,
    description: "Tees fit. Product details and price are temporary.",
  },
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
    image: p.images[0] ?? "",
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
  return p ? mapDbProduct(p as unknown as DbProduct) : SOURCE_PRODUCTS.find((product) => product.slug === slug);
}

export async function getAllProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  const mapped = (products as unknown as DbProduct[]).map(mapDbProduct);
  const existingSlugs = new Set(mapped.map((product) => product.slug));
  return [...mapped, ...SOURCE_PRODUCTS.filter((product) => !existingSlugs.has(product.slug))];
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
      take: 30,
    });
    const mapped = (products as unknown as DbProduct[]).map(mapDbProduct);
    return [
      ...SOURCE_PRODUCTS,
      ...mapped.filter((product) => !SOURCE_PRODUCTS.some((source) => source.slug === product.slug)),
    ];
  },
  ["new-arrivals"],
  { revalidate: 60, tags: ["products"] },
);
