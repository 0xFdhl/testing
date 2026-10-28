import { easeIn, easeInOut, easeOut } from "framer-motion";

/** Material standard easing — sama dengan navbar */
export const EASE_OUT: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const SPRING_SNAPPY = { type: "spring" as const, stiffness: 420, damping: 32 };

export const DURATION_FAST = 0.22;

export const DURATION_MODAL = 0.32;

/** Easing helpers for useTransform multi-keyframe segments */
export const EASE_RISE = easeOut;
export const EASE_SETTLE = easeIn;
export const EASE_SYMMETRIC = easeInOut;

/** Scroll-follow spring — ζ ≈ 0.83 (underdamped-critical band). */
export const NAVBAR_SCROLL_SPRING = { stiffness: 110, damping: 15, mass: 0.75 };
