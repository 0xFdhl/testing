"use client";

import {
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef, useState, type RefObject } from "react";
import {
  EASE_RISE,
  EASE_SETTLE,
  EASE_SYMMETRIC,
  OPENING_SCROLL_SPRING,
} from "@/lib/motion";

/** Scroll distance consumed by the opening sequence */
export const OPENING_SCROLL_HEIGHT = "100svh";

/** Single crossfade window: overlay logo fades out, navbar zone clears,
 *  and the overlay logo's own light/dark swap all happen together here. */
const CROSSFADE_START = 0.55;
const CROSSFADE_END = 0.68;

export type OpeningScrollValues = {
  progress: MotionValue<number>;
  letterSpacing: MotionValue<string>;
  radialOpacity: MotionValue<number>;
  logoTranslateY: MotionValue<string>;
  logoScale: MotionValue<number>;
  logoRotateX: MotionValue<number>;
  logoRotateY: MotionValue<number>;
  logoLightOpacity: MotionValue<number>;
  logoDarkOpacity: MotionValue<number>;
  overlayLogoOpacity: MotionValue<number>;
  navbarZoneOpacity: MotionValue<number>;
  mainOverlayOpacity: MotionValue<number>;
  scrollHintOpacity: MotionValue<number>;
  isComplete: boolean;
  prefersReducedMotion: boolean | null;
};

export function useOpeningScroll(
  // Kept for API compatibility with OpeningOverlay's call site.
  // No longer used internally — there's no navbar DOM measurement anymore.
  _overlayLogoRef: RefObject<HTMLElement | null>,
): OpeningScrollValues & {
  spacerRef: RefObject<HTMLDivElement | null>;
} {
  const spacerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isComplete, setIsComplete] = useState(false);

  const { scrollYProgress } = useScroll({
    target: spacerRef,
    offset: ["start start", "end start"],
  });

  const progress = useSpring(
    scrollYProgress,
    prefersReducedMotion
      ? { stiffness: 1000, damping: 100, mass: 1 }
      : OPENING_SCROLL_SPRING,
  );

  const letterSpacing = useTransform(progress, [0, 0.1], ["-0.04em", "-0.14em"], {
    ease: EASE_RISE,
  });

  const radialOpacity = useTransform(
    progress,
    [0.15, 0.22, 0.45],
    [0, 0.85, 0.35],
    { ease: [EASE_RISE, EASE_SETTLE] },
  );

  // Logo stays centered the whole time — no dock morph, no offset, no scale change.
  const logoTranslateY = useTransform(progress, () => "-50%");
  const logoScale = useTransform(progress, () => 1);

  const logoRotateX = useTransform(progress, [0.35, 0.42, 0.5], [0, 5, 0], {
    ease: [EASE_SYMMETRIC, EASE_SYMMETRIC],
  });

  const logoRotateY = useTransform(progress, [0.35, 0.42, 0.5], [0, -4, 0], {
    ease: [EASE_SYMMETRIC, EASE_SYMMETRIC],
  });

  const logoLightOpacity = useTransform(
    progress,
    [0, CROSSFADE_START, CROSSFADE_END],
    [1, 1, 0],
    { ease: EASE_SETTLE },
  );

  const logoDarkOpacity = useTransform(
    progress,
    [CROSSFADE_START, CROSSFADE_END],
    [0, 1],
    { ease: EASE_RISE },
  );

  /** Overlay logo fades out in place — this is the whole "stick" moment */
  const overlayLogoOpacity = useTransform(
    progress,
    [CROSSFADE_START, CROSSFADE_END],
    [1, 0],
    { ease: EASE_SETTLE },
  );

  /** Navbar zone clears at the same time, revealing the real navbar's
   *  own "varcasvi_" text fading in underneath */
  const navbarZoneOpacity = useTransform(
    progress,
    [CROSSFADE_START, CROSSFADE_END],
    [1, 0],
    { ease: EASE_SETTLE },
  );

  const mainOverlayOpacity = useTransform(progress, [0.84, 1], [1, 0], {
    ease: EASE_SETTLE,
  });

  const scrollHintOpacity = useTransform(
    progress,
    [0, 0.08, 0.18],
    [1, 1, 0],
    { ease: EASE_SETTLE },
  );

  useMotionValueEvent(progress, "change", (value) => {
    setIsComplete(value >= 0.995);
  });

  return {
    spacerRef,
    progress,
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
  };
}
