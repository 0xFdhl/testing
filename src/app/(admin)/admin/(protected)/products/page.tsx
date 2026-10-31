import Image from "next/image";
import Link from "next/link";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
} from "@/components/admin/data-table";
import { formatIdr } from "@/lib/format-admin";
import { prisma } from "@/lib/prisma";
import { productCategories } from "@/schemas/admin";

type PageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    category?: string;
  }>;
};

function getTotalStock(stock: unknown): number {
  if (!stock || typeof stock !== "object") return 0;
  return Object.values(stock as Record<string, number>).reduce(
    (sum, n) => sum + (Number(n) || 0),
    0,
  );
}

export default async function AdminProductsPage({ searchParams }: PageProps) {

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const perPage = 10;
  const q = params.q?.trim() ?? "";
  const category = params.category?.trim() ?? "";

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(category && category !== "all"
      ? { category }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Products</h1>
          <p className="mt-1 text-sm text-zinc-400">{total} products total</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
        >
          Add Product
        </Link>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-500"
        />
        <select
          name="category"
          defaultValue={category || "all"}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-500"
        >
          <option value="all">All categories</option>
          {productCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Filter
        </button>
      </form>

      {products.length === 0 ? (
        <EmptyState message="No products found." />
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Image</DataTableHeaderCell>
              <DataTableHeaderCell>Name</DataTableHeaderCell>
              <DataTableHeaderCell>Category</DataTableHeaderCell>
              <DataTableHeaderCell>Price</DataTableHeaderCell>
              <DataTableHeaderCell>Stock</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Actions</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {products.map((product) => {
              const totalStock = getTotalStock(product.stock);
              return (
                <DataTableRow key={product.id}>
                  <DataTableCell>
                    {product.images[0]?.startsWith("https://") ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-500">
                        N/A
                      </div>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    <div>
                      <p className="font-medium text-white">{product.name}</p>
                      <p className="text-xs text-zinc-500">{product.slug}</p>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="capitalize">{product.category}</DataTableCell>
                  <DataTableCell>{formatIdr(product.price)}</DataTableCell>
                  <DataTableCell>{totalStock}</DataTableCell>
                  <DataTableCell>
                    <span
                      className={
                        totalStock > 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {totalStock > 0 ? "In stock" : "Out of stock"}
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="text-sm text-zinc-300 hover:text-white hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteProductButton
                        productId={product.id}
                        productName={product.name}
                      />
                    </div>
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/products?page=${page - 1}&q=${q}&category=${category}`}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/products?page=${page + 1}&q=${q}&category=${category}`}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
