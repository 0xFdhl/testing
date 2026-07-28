"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { heroSlides } from "@/config/assets";

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const goTo = useCallback(
    (next: number) => {
      setDirection(next > index ? 1 : -1);
      setIndex(
        ((next % heroSlides.length) + heroSlides.length) % heroSlides.length,
      );
    },
    [index],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  const slide = heroSlides[index];

  const handleDragEnd = (
    _: unknown,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    if (info.offset.x < -80 || info.velocity.x < -500) {
      next();
    } else if (info.offset.x > 80 || info.velocity.x > 500) {
      prev();
    }
  };

  return (
    <section
      aria-label="Hero"
      className="relative h-[110svh] min-h-[100svh] w-full shrink-0 snap-start snap-always overflow-hidden bg-white"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          initial={{ x: direction >= 0 ? "100%" : "-100%", opacity: 0 }}
          animate={{ x: "0%", opacity: 1 }}
          exit={{ x: direction >= 0 ? "-100%" : "100%", opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          drag={heroSlides.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="absolute inset-0"
        >
          <Link
            href={slide.href ?? "#"}
            className="relative block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            aria-label={`Shop ${slide.alt}`}
          >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={index === 0}
            className="object-cover object-center contrast-[1.14] brightness-[1.00] saturate-10"
            sizes="100vw"
            quality={90}
          />
          </Link>
        </motion.div>
      </AnimatePresence>

      {heroSlides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={prev}
            className="absolute top-1/2 left-4 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-black backdrop-blur-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:left-6"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={next}
            className="absolute top-1/2 right-4 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-black backdrop-blur-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:right-6"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  i === index ? "w-6 bg-black" : "w-1.5 bg-black/30"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}