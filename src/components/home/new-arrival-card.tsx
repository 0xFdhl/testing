import Link from "next/link";
import Image from "next/image";

import type { Product } from "@/lib/products";
import { formatIdr } from "@/lib/format";

type NewArrivalCardProps = {
  product: Product;
};

export function NewArrivalCard({ product }: NewArrivalCardProps) {
  return (
    <article className="group flex w-full shrink-0 flex-col">
      <Link
        href={`/shop/${product.slug}`}
        className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        aria-label={product.name}
      >
        <div aria-hidden className="relative aspect-square overflow-hidden bg-neutral-100 transition-colors group-hover:bg-neutral-200">
          {product.image.startsWith("https://") && (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 72vw, 20vw"
            />
          )}
        </div>

        <div className="mt-3 space-y-0.5 sm:mt-4">
          <p className="text-[11px] font-normal leading-tight tracking-[-0.02em] text-black sm:text-xs">
            {product.name}
          </p>
          <p className="text-[10px] leading-tight text-neutral-500 sm:text-[11px]">
            {formatIdr(product.price)}
          </p>
        </div>
      </Link>
    </article>
  );
}
