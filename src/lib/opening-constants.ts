/**
 * Konstanta bersama untuk opening intro (scroll-driven).
 * Satu-satunya sumber kebenaran untuk nilai yang dipakai lintas file:
 * use-opening-scroll.ts, opening-overlay.tsx, opening-provider.tsx, navbar.tsx.
 */

/** Tinggi spacer = jarak scroll yang dikonsumsi intro */
export const OPENING_SCROLL_HEIGHT = "100svh";

/** Key sessionStorage untuk skip intro pada kunjungan ulang (per sesi) */
export const OPENING_SESSION_KEY = "opening-intro-seen";

/** Teks wordmark — HARUS identik antara logo overlay & wordmark navbar */
export const OPENING_LOGO_TEXT = "varcasvi_";

/** Letter-spacing awal (longgar) & akhir (rapat). Navbar memakai yang FINAL. */
export const OPENING_TRACKING_INITIAL = "-0.04em";
export const OPENING_TRACKING_FINAL = "-0.14em";

/**
 * Timeline intro dalam progress scroll (0 → 1).
 * Fase: tracking rapat → radial light → MORPH ke navbar →
 * reveal zona navbar + swap warna → handoff pixel-perfect → backdrop fade.
 */
export const OPENING_TIMELINE = {
  /** Tracking selesai merapat */
  TRACKING_END: 0.1,
  /** Radial light: masuk / puncak / reda */
  RADIAL_IN: 0.15,
  RADIAL_PEAK: 0.22,
  RADIAL_REST: 0.45,
  /** Morph: translate + scale dari tengah viewport ke wordmark navbar */
  MORPH_START: 0.2,
  MORPH_END: 0.72,
  /** Wobble 3D di tengah penerbangan */
  WOBBLE_START: 0.35,
  WOBBLE_PEAK: 0.42,
  WOBBLE_END: 0.5,
  /** Mask zona navbar terbuka + logo swap putih → hitam */
  REVEAL_START: 0.72,
  REVEAL_END: 0.84,
  /** Handoff: logo overlay fade out, wordmark navbar asli fade in */
  HANDOFF_START: 0.84,
  HANDOFF_END: 0.9,
  /** Backdrop hitam utama fade out */
  BACKDROP_START: 0.88,
  BACKDROP_END: 1,
  /** Scroll hint: tahan penuh, lalu hilang */
  HINT_HOLD: 0.08,
  HINT_GONE: 0.18,
} as const;

/** Progress ≥ nilai ini dianggap selesai (unmount visual + set session flag) */
export const OPENING_COMPLETE_THRESHOLD = 0.995;

/** Debounce re-measure posisi morph saat window resize */
export const OPENING_RESIZE_DEBOUNCE_MS = 150;
