"use client";

import { useActionState, useState } from "react";
import { slugify } from "@/lib/format-admin";
import {
  createProductAction,
  updateProductAction,
  type ActionResult,
} from "@/lib/admin-actions";
import { displaySizes, productCategories } from "@/schemas/admin";
import type { Product } from "@/generated/prisma/client";

type ProductFormProps = {
  product?: Product;
};

const initialState: ActionResult = { success: false };

function getStockValue(stock: unknown, size: string): number {
  if (stock && typeof stock === "object" && size in (stock as Record<string, unknown>)) {
    return Number((stock as Record<string, number>)[size]) || 0;
  }
  return 0;
}

export function ProductForm({ product }: ProductFormProps) {
  const isEdit = Boolean(product);
  const boundAction = isEdit
    ? updateProductAction.bind(null, product!.id)
    : createProductAction;

  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [autoSlug, setAutoSlug] = useState(!isEdit);
  const [images, setImages] = useState<string[]>(product?.images ?? [""]);
  const [sizingInfo, setSizingInfo] = useState<string[]>(
    product?.sizingInfo?.length ? product.sizingInfo : [""],
  );
  const [shippingInfo, setShippingInfo] = useState<string[]>(
    product?.shippingInfo?.length ? product.shippingInfo : [""],
  );
  const [returnsInfo, setReturnsInfo] = useState<string[]>(
    product?.returnsInfo?.length ? product.returnsInfo : [""],
  );

  const derivedSlug = autoSlug ? slugify(name) : slug;

  function updateListItem(
    list: string[],
    setList: (v: string[]) => void,
    index: number,
    value: string,
  ) {
    const next = [...list];
    next[index] = value;
    setList(next);
  }

  function removeListItem(
    list: string[],
    setList: (v: string[]) => void,
    index: number,
  ) {
    setList(list.filter((_, i) => i !== index));
  }

  return (
    <form action={formAction} className="space-y-8">
      {state.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}
      {state.success && isEdit && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          Product saved successfully.
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="text-lg font-medium text-white">Basic Info</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-400">Name</span>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-400">Slug</span>
            <div className="flex gap-2">
              <input
                name="slug"
                value={derivedSlug}
                onChange={(e) => {
                  setAutoSlug(false);
                  setSlug(e.target.value);
                }}
                required
                pattern="[a-z0-9-]+"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              />
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => setAutoSlug(true)}
                  className="shrink-0 rounded-lg border border-zinc-700 px-3 text-xs text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  Auto
                </button>
              )}
            </div>
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm text-zinc-400">Description</span>
          <textarea
            name="description"
            defaultValue={product?.description ?? ""}
            rows={4}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-400">Category</span>
            <select
              name="category"
              defaultValue={product?.category ?? "jacket"}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              {productCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-400">Price (IDR)</span>
            <input
              name="price"
              type="number"
              min={1}
              step={1}
              defaultValue={product?.price ?? ""}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Images</h2>
          <button
            type="button"
            onClick={() => setImages([...images, ""])}
            className="rounded-sm text-sm text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            + Add URL
          </button>
        </div>
        {images.map((url, i) => (
          <div key={i} className="flex gap-2">
            <input
              name="images"
              value={url}
              onChange={(e) => updateListItem(images, setImages, i, e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            />
            {images.length > 1 && (
              <button
                type="button"
                aria-label={`Remove image URL ${i + 1}`}
                onClick={() => removeListItem(images, setImages, i)}
                className="rounded-lg border border-zinc-700 px-3 text-zinc-400 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="text-lg font-medium text-white">Stock by Size</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {displaySizes.map((size) => (
            <label key={size} className="block space-y-1.5">
              <span className="text-sm text-zinc-400">{size}</span>
              <input
                name={`stock_${size}`}
                type="number"
                min={0}
                defaultValue={getStockValue(product?.stock, size)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="text-lg font-medium text-white">Optional Details</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-400">Badge</span>
            <input
              name="badge"
              defaultValue={product?.badge ?? ""}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-400">Color Label</span>
            <input
              name="colorLabel"
              defaultValue={product?.colorLabel ?? ""}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-400">Fit Note</span>
            <input
              name="fitNote"
              defaultValue={product?.fitNote ?? ""}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            />
          </label>
        </div>
      </section>

      <RepeatableFieldGroup
        title="Sizing Info"
        name="sizingInfo"
        items={sizingInfo}
        setItems={setSizingInfo}
      />
      <RepeatableFieldGroup
        title="Shipping Info"
        name="shippingInfo"
        items={shippingInfo}
        setItems={setShippingInfo}
      />
      <RepeatableFieldGroup
        title="Returns Info"
        name="returnsInfo"
        items={returnsInfo}
        setItems={setReturnsInfo}
      />

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
        </button>
      </div>
    </form>
  );
}

function RepeatableFieldGroup({
  title,
  name,
  items,
  setItems,
}: {
  title: string;
  name: string;
  items: string[];
  setItems: (v: string[]) => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">{title}</h2>
        <button
          type="button"
          onClick={() => setItems([...items, ""])}
          className="rounded-sm text-sm text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          + Add
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            name={name}
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              setItems(next);
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          />
          {items.length > 1 && (
            <button
              type="button"
              aria-label={`Remove ${title} item ${i + 1}`}
              onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              className="rounded-lg border border-zinc-700 px-3 text-zinc-400 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
