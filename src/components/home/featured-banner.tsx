import type { Product } from "@/lib/products";
import { NewArrivalCard } from "@/components/home/new-arrival-card";

export function FeaturedBanner({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-heading"
      className="bg-white px-[5vw] pb-[12vh] pt-[4vh] text-black"
    >
      <h2
        id="featured-heading"
        className="mb-10 flex w-fit flex-col text-[clamp(2rem,4vw,3.5rem)] font-medium leading-[0.82] tracking-[-0.075em] sm:mb-14 md:mb-16"
      >
        <span>Fea</span>
        <span className="flex items-end gap-1.5">
          tured
          <span
            aria-hidden
            className="mb-[0.16em] h-[0.24em] w-[0.24em] bg-black"
            style={{ clipPath: "polygon(0 100%, 100% 100%, 100% 0)" }}
          />
        </span>
      </h2>

      <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-12">
        {products.map((product) => (
          <NewArrivalCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
