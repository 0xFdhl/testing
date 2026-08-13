import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { getSession } from "@/lib/auth";
import { getAdminsCanEditPhotos } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;

  const [product, session, adminsCanEditPhotos] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    getSession(),
    getAdminsCanEditPhotos(),
  ]);
  if (!product) notFound();

  const canEditPhotos =
    session?.role === "SUPERADMIN" || adminsCanEditPhotos;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Edit Product</h1>
        <p className="mt-1 text-sm text-zinc-400">{product.name}</p>
      </div>
      <ProductForm product={product} canEditPhotos={canEditPhotos} />
    </div>
  );
}
