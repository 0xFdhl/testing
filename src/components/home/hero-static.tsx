import Image from "next/image";
import Link from "next/link";
import { heroSlides } from "@/config/assets";

export function HeroStatic() {
  const slide = heroSlides[0];

  return (
    <section
      aria-label="Hero"
      className="relative flex h-[110svh] min-h-[100svh] w-full shrink-0 snap-start snap-always items-center justify-center overflow-hidden bg-white"
    >
      <Link
        href={slide.href ?? "#"}
        className="relative block h-[70%] w-[80%] max-w-[1100px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        aria-label={`Shop ${slide.alt}`}
      >
        <Image
          src={slide.src}
          alt={slide.alt}
          fill
          priority
          className="object-contain contrast-[1.14] brightness-[1.00] saturate-10"
          sizes="100vw"
          quality={90}
        />
      </Link>
    </section>
  );
}
