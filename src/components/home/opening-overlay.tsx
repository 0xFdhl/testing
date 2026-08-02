"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import {
  OPENING_SCROLL_HEIGHT,
  useOpeningScroll,
} from "@/hooks/use-opening-scroll";
import { cn } from "@/lib/utils";

function OpeningLogo({
  letterSpacing,
  lightOpacity,
  darkOpacity,
}: {
  letterSpacing: ReturnType<typeof useOpeningScroll>["letterSpacing"];
  lightOpacity: ReturnType<typeof useOpeningScroll>["logoLightOpacity"];
  darkOpacity: ReturnType<typeof useOpeningScroll>["logoDarkOpacity"];
}) {
  const textClass =
    "block font-sans text-3xl font-bold leading-none lowercase sm:text-4xl md:text-5xl lg:text-[3.25rem]";

  return (
    <span aria-hidden className="relative block select-none whitespace-nowrap">
      <motion.span
        className={cn(textClass, "absolute inset-0 text-white")}
        style={{ letterSpacing, opacity: lightOpacity }}
      >
        varcasvi_
      </motion.span>
      <motion.span
        className={cn(textClass, "relative text-black")}
        style={{ letterSpacing, opacity: darkOpacity }}
      >
        varcasvi_
      </motion.span>
    </span>
  );
}

export function OpeningOverlay() {
  const overlayLogoRef = useRef<HTMLDivElement>(null);
  const {
    spacerRef,
    letterSpacing,
    radialOpacity,
    logoTranslateY,
    logoScale,
    logoRotateX,
    logoRotateY,
    logoLightOpacity,
    logoDarkOpacity,
    overlayLogoOpacity,
    navbarZoneOpacity,
    mainOverlayOpacity,
    scrollHintOpacity,
    isComplete,
    prefersReducedMotion,
  } = useOpeningScroll(overlayLogoRef);

  // Reduced motion: skip scroll-hijack spacer + overlay; site remains fully usable.
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <>
      <div
        ref={spacerRef}
        aria-hidden
        className="pointer-events-none w-full shrink-0"
        style={{ height: OPENING_SCROLL_HEIGHT }}
      />

      <motion.div
        aria-hidden={isComplete}
        className="pointer-events-none fixed inset-0 z-[60]"
      >
        {/* Main backdrop — body only; navbar zone stays clear after 50% */}
        <motion.div
          className="absolute inset-x-0 bottom-0 top-[calc(env(safe-area-inset-top)+var(--navbar-height))] bg-[#0a0a0a] md:top-[calc(env(safe-area-inset-top)+var(--navbar-height-md))]"
          style={{ opacity: mainOverlayOpacity, willChange: "opacity" }}
        />

        {/* Navbar-zone mask — hides real navbar until reveal, then clears */}
        <motion.div
          className="absolute inset-x-0 top-0 bg-[#0a0a0a] pt-[env(safe-area-inset-top)] md:hidden"
          style={{
            height: "calc(env(safe-area-inset-top) + var(--navbar-height))",
            opacity: navbarZoneOpacity,
            willChange: "opacity",
          }}
        />
        <motion.div
          className="absolute inset-x-0 top-0 hidden bg-[#0a0a0a] pt-[env(safe-area-inset-top)] md:block"
          style={{
            height: "calc(env(safe-area-inset-top) + var(--navbar-height-md))",
            opacity: navbarZoneOpacity,
            willChange: "opacity",
          }}
        />

        {/* Soft radial light — appears at 20% */}
        <motion.div
          className="absolute inset-0 z-[1] flex items-center justify-center"
          style={{ opacity: radialOpacity, willChange: "opacity" }}
        >
          <div
            className="h-[min(90vw,640px)] w-[min(90vw,640px)] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 38%, transparent 68%)",
            }}
          />
        </motion.div>

        {/* Animated logo — center → navbar dock */}
        <div
          className="absolute inset-0 z-[2] [perspective:900px]"
          style={{ transformStyle: "preserve-3d" }}
        >
          <motion.div
            ref={overlayLogoRef}
            className="absolute left-1/2 top-1/2 origin-center"
            style={{
              x: "-50%",
              y: logoTranslateY,
              scale: logoScale,
              rotateX: logoRotateX,
              rotateY: logoRotateY,
              opacity: overlayLogoOpacity,
              willChange: "transform, opacity",
            }}
          >
            <OpeningLogo
              letterSpacing={letterSpacing}
              lightOpacity={logoLightOpacity}
              darkOpacity={logoDarkOpacity}
            />
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          className="absolute inset-x-0 bottom-[max(1.75rem,env(safe-area-inset-bottom))] z-[3] flex flex-col items-center gap-2"
          style={{ opacity: scrollHintOpacity, willChange: "opacity" }}
        >
          <span className="text-[10px] font-semibold tracking-[0.32em] text-white/45 uppercase">
            Scroll
          </span>
          <motion.span
            className="block h-8 w-px origin-top bg-white/35"
            animate={{ scaleY: [1, 0.45, 1] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
