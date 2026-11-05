import Image from "next/image";

export function HeroStatic() {
  return (
    <section
      aria-label="Discover the collection"
      className="relative h-svh w-full shrink-0 overflow-hidden bg-black"
    >
      <div className="absolute inset-0">
        <Image
          src="/products/varcasvi/Fire%20man%20claps%20jacket%20-%20Jill%20valentine%20.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-65"
        />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.18)_0%,rgba(0,0,0,0.62)_85%)]" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.15)_42%,rgba(0,0,0,0.5)_100%)]"
        />
      </div>
    </section>
  );
}
