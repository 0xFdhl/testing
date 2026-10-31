"use client";

import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

const BRAND = "varcasvi.";
const HERO_LINK = "/shop";

export function HeroStatic() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [smallTitleScale, setSmallTitleScale] = useState(0.08);
  const prefersReducedMotion = useReducedMotion();
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
    [0, 0.8, 1],
    ["0svh", "-45svh", "-45svh"],
  );
  const titleScale = useTransform(
    smoothProgress,
    [0, 0.8, 1],
    [1, smallTitleScale, smallTitleScale],
  );
  const titleOpacity = useTransform(
    smoothProgress,
    [0, 0.86, 0.94, 1],
    [1, 1, 0, 0],
  );

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
      aria-label="varcasvi. — discover the collection"
      className="relative h-[260svh] w-full shrink-0 bg-black"
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden bg-black">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#292929_0%,#0a0a0a_70%)]" />
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
            href={HERO_LINK}
            aria-label="Shop varcasvi. collection"
            className="rounded-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-8 focus-visible:ring-offset-black"
          >
            <h1 className="select-none whitespace-nowrap font-sans text-[clamp(3.5rem,22vw,22rem)] leading-[0.78] tracking-[-0.095em]">
              <span ref={titleRef} className="inline-block pr-[0.08em]">
                {BRAND}
              </span>
            </h1>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
