import Link from "next/link";

export function NewWinterSection() {
  return (
    <section className="relative w-full bg-black py-16">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          New Winter Collection
        </h2>
        <p className="mt-4 text-lg text-zinc-400">
          Gear up for the season with our latest drops.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex h-12 items-center rounded-md bg-white px-8 text-sm font-medium text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Shop Now
        </Link>
      </div>
    </section>
  );
}
