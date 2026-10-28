"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { heroSlides } from "@/config/assets";

const BRAND = "varcasvi_";

export function HeroStatic() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [smallTitleScale, setSmallTitleScale] = useState(0.08);
  const prefersReducedMotion = useReducedMotion();
  const slide = heroSlides[0];
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 18,
    mass: 0.4,
  });
  const titleY = useTransform(
    smoothProgress,
    [0, 0.7, 1],
    ["0svh", "-45svh", "-45svh"],
  );
  const titleScale = useTransform(
    smoothProgress,
    [0, 0.7, 1],
    [1, smallTitleScale, smallTitleScale],
  );
  const titleOpacity = useTransform(
    smoothProgress,
    [0, 0.66, 0.76, 1],
    [1, 1, 0, 0],
  );
  const cueOpacity = useTransform(smoothProgress, [0, 0.12], [1, 0]);

  useEffect(() => {
    const measureTitle = () => {
      const title = titleRef.current;
      if (!title) return;
      const fontSize = Number.parseFloat(window.getComputedStyle(title).fontSize);
      if (fontSize > 0) setSmallTitleScale(Math.min(1, 20 / fontSize));
    };

    measureTitle();
    window.addEventListener("resize", measureTitle);
    return () => window.removeEventListener("resize", measureTitle);
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="varcasvi_ — discover the collection"
      className="relative h-[190svh] w-full shrink-0 bg-black"
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden bg-black">
        <Image
          src={slide.src}
          alt=""
          aria-hidden
          fill
          priority
          className="object-cover object-center opacity-80"
          sizes="100vw"
          quality={90}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.15)_42%,rgba(0,0,0,0.5)_100%)]"
        />

        <motion.div
          className="absolute inset-0 z-10 flex items-center justify-center"
          style={{
            y: prefersReducedMotion ? 0 : titleY,
            scale: prefersReducedMotion ? 1 : titleScale,
            opacity: prefersReducedMotion ? 1 : titleOpacity,
          }}
        >
          <Link
            href={slide.href ?? "/shop"}
            aria-label={`Shop ${slide.alt}`}
            className="rounded-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-8 focus-visible:ring-offset-black"
          >
            <h1 className="select-none whitespace-nowrap font-sans text-[clamp(3.5rem,22vw,22rem)] font-black leading-[0.78] tracking-[-0.095em]">
              <span ref={titleRef} className="inline-block pr-[0.08em]">
                {BRAND}
              </span>
            </h1>
          </Link>
        </motion.div>

        <motion.div
          aria-hidden
          style={{ opacity: cueOpacity }}
          className="absolute inset-x-0 bottom-10 z-20 flex flex-col items-center gap-3 text-[10px] font-semibold tracking-[0.28em] text-white/80 uppercase"
        >
          <span>Scroll to explore</span>
          <span className="h-9 w-px bg-white/70" />
        </motion.div>
      </div>
    </section>
  );
}
