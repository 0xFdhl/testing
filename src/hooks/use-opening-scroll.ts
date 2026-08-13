"use client";

import {
  animate,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  useMotionValue,
  type MotionValue,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  EASE_RISE,
  EASE_SETTLE,
  EASE_SYMMETRIC,
  OPENING_SCROLL_SPRING,
} from "@/lib/motion";
import {
  OPENING_COMPLETE_THRESHOLD,
  OPENING_RESIZE_DEBOUNCE_MS,
  OPENING_TIMELINE,
  OPENING_TRACKING_FINAL,
  OPENING_TRACKING_INITIAL,
} from "@/lib/opening-constants";

/** Satu gestur penuh (≈ satu viewport wheel) = seluruh intro. */
const WHEEL_REACH_MULTIPLIER = 1.5;
/** Batas kontribusi tiap event wheel, biar momentum trackpad tak meleset jauh. */
const WHEEL_EVENT_MAX_STEP = 0.12;
/** Kontribusi tiap penekanan tombol panah/Page. */
const KEY_NUDGE_STEP = 0.1;

/** Geometri morph hasil pengukuran DOM */
interface MorphMetrics {
  dx: number;
  dy: number;
  scale: number;
}

/** Fallback aman bila pengukuran gagal: logo diam di tengah (perilaku lama) */
const IDENTITY_MORPH: MorphMetrics = { dx: 0, dy: 0, scale: 1 };

export type OpeningScrollValues = {
  progress: MotionValue<number>;
  letterSpacing: MotionValue<string>;
  radialOpacity: MotionValue<number>;
  logoTranslateX: MotionValue<number>;
  logoTranslateY: MotionValue<number>;
  logoScale: MotionValue<number>;
  logoRotateX: MotionValue<number>;
  logoRotateY: MotionValue<number>;
  logoLightOpacity: MotionValue<number>;
  logoDarkOpacity: MotionValue<number>;
  overlayLogoOpacity: MotionValue<number>;
  navbarZoneOpacity: MotionValue<number>;
  navbarLogoOpacity: MotionValue<number>;
  mainOverlayOpacity: MotionValue<number>;
  scrollHintOpacity: MotionValue<number>;
  skipButtonOpacity: MotionValue<number>;
  isComplete: boolean;
  prefersReducedMotion: boolean | null;
  requestSkip: () => void;
};

export type OpeningHookResult = OpeningScrollValues & {
  overlayLogoRef: RefObject<HTMLDivElement | null>;
  measure: () => void;
};

/**
 * Source of truth animasi opening intro.
 *
 * @param targetRef  Ref elemen wordmark navbar (didaftarkan via OpeningProvider)
 *                   — jadi target pendaratan morph.
 * @param disabled   true → intro diskip total (session/reduced motion);
 *                   semua pengukuran & skip dimatikan.
 */
export function useOpeningScroll(
  targetRef: RefObject<HTMLElement | null>,
  disabled: boolean,
): OpeningHookResult {
  const overlayLogoRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isComplete, setIsComplete] = useState(false);
  const [morph, setMorph] = useState<MorphMetrics>(IDENTITY_MORPH);
  const completeRef = useRef(false);

  // SCROLL-HIJACK: progress digerakkan manual oleh wheel/touch/keyboard,
  // BUKAN native scroll. Body dikunci selama intro aktif sehingga konten
  // home di belakang tidak ikut bergeser — "scroll belum ngefek ke home".
  // Begitu complete, kunci dibuka & listener dilepas.
  const targetProgress = useMotionValue(0);
  const progress = useSpring(
    targetProgress,
    prefersReducedMotion
      ? { stiffness: 1000, damping: 100, mass: 1 }
      : OPENING_SCROLL_SPRING,
  );

  /**
   * Ukur geometri morph via getBoundingClientRect + getComputedStyle:
   * - Posisi awal = tengah viewport (wrapper logo sudah di-center via CSS murni,
   *   jadi tidak perlu diukur — dan kebal terhadap transform framer).
   * - Posisi akhir = tengah rect wordmark navbar. Navbar `fixed`, jadi rect
   *   viewport-nya stabil selama intro berjalan.
   * - Skala = rasio font-size computed. getComputedStyle kebal terhadap
   *   transform, jadi aman diukur kapan pun (bahkan saat logo sedang termorph)
   *   dan otomatis responsif mengikuti breakpoint font mobile/desktop.
   */
  const measure = useCallback(() => {
    if (disabled) return;
    const logoEl = overlayLogoRef.current;
    const targetEl = targetRef.current;
    if (!logoEl || !targetEl) return;

    const startFont = parseFloat(getComputedStyle(logoEl).fontSize);
    const endFont = parseFloat(getComputedStyle(targetEl).fontSize);
    if (!startFont || !endFont) return;

    const targetRect = targetEl.getBoundingClientRect();
    if (targetRect.width === 0 || targetRect.height === 0) return;

    setMorph({
      dx: targetRect.left + targetRect.width / 2 - window.innerWidth / 2,
      dy: targetRect.top + targetRect.height / 2 - window.innerHeight / 2,
      scale: endFont / startFont,
    });
  }, [disabled, targetRef]);

  // Ukur saat mount, setelah font termuat, dan setelah entry animation navbar
  // (motion.header slide dari y:-24 selama ~550ms) selesai.
  useEffect(() => {
    if (disabled) return;
    measure();
    const timeout = window.setTimeout(measure, 800);
    void document.fonts.ready.then(measure).catch(() => {});
    return () => window.clearTimeout(timeout);
  }, [disabled, measure]);

  // Re-measure saat resize (debounced)
  useEffect(() => {
    if (disabled) return;
    let id: number | undefined;
    const onResize = () => {
      window.clearTimeout(id);
      id = window.setTimeout(measure, OPENING_RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", onResize);
    };
  }, [disabled, measure]);

  // SCROLL-HIJACK: kunci body + dengarkan wheel/touch/keyboard untuk
  // menggerakkan targetProgress. Hanya aktif selama intro berjalan.
  // Home di belakang diam total — "scroll belum ngefek ke home".
  useEffect(() => {
    if (disabled || completeRef.current) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    // Pastikan start dari puncak (hindari restored-scroll yang meleset)
    window.scrollTo(0, 0);

    // Ingat progress awal saat touch dimulai (untuk arah balik yang konsisten)
    let touchStartY: number | null = null;
    let touchStartProgress = 0;

    const nudge = (delta: number) => {
      if (completeRef.current) return;
      const next = targetProgress.get() + delta;
      targetProgress.set(Math.min(1, Math.max(0, next)));
    };

    const clampStep = (d: number) =>
      Math.max(-WHEEL_EVENT_MAX_STEP, Math.min(WHEEL_EVENT_MAX_STEP, d));

    const onWheel = (e: WheelEvent) => {
      if (completeRef.current) return;
      e.preventDefault();
      if (Math.abs(e.deltaY) < 1) return; // buang noise trackpad diam
      const reach = window.innerHeight * WHEEL_REACH_MULTIPLIER;
      nudge(clampStep(e.deltaY / reach));
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartY = e.touches[0]!.clientY;
      touchStartProgress = targetProgress.get();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (completeRef.current || touchStartY === null) return;
      e.preventDefault();
      const y = e.touches[0]!.clientY;
      // Drag ke atas (deltaY negatif) => progress maju
      const delta = (touchStartY - y) / window.innerHeight;
      targetProgress.set(
        Math.min(1, Math.max(0, touchStartProgress + delta)),
      );
    };

    const onTouchEnd = () => {
      touchStartY = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (completeRef.current) return;
      // Jangan membajak ketikan di form
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        nudge(KEY_NUDGE_STEP);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        nudge(-KEY_NUDGE_STEP);
      }
    };

    // passive:false wajib agar preventDefault benar-benar mencegah scroll
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [disabled, targetProgress, isComplete]);

  const T = OPENING_TIMELINE;

  const letterSpacing = useTransform(
    progress,
    [0, T.TRACKING_END],
    [OPENING_TRACKING_INITIAL, OPENING_TRACKING_FINAL],
    { ease: EASE_RISE },
  );

  const radialOpacity = useTransform(
    progress,
    [T.RADIAL_IN, T.RADIAL_PEAK, T.RADIAL_REST],
    [0, 0.85, 0.35],
    { ease: [EASE_RISE, EASE_SETTLE] },
  );

  // TRUE MORPH — translate + scale kontinu dari tengah viewport ke wordmark
  // navbar, ter-link penuh ke scroll progress (bukan crossfade, bukan snap).
  const logoTranslateX = useTransform(
    progress,
    [T.MORPH_START, T.MORPH_END],
    [0, morph.dx],
    { ease: EASE_SYMMETRIC },
  );
  const logoTranslateY = useTransform(
    progress,
    [T.MORPH_START, T.MORPH_END],
    [0, morph.dy],
    { ease: EASE_SYMMETRIC },
  );
  const logoScale = useTransform(
    progress,
    [T.MORPH_START, T.MORPH_END],
    [1, morph.scale],
    { ease: EASE_SYMMETRIC },
  );

  // Wobble 3D halus di tengah penerbangan
  const logoRotateX = useTransform(
    progress,
    [T.WOBBLE_START, T.WOBBLE_PEAK, T.WOBBLE_END],
    [0, 5, 0],
    { ease: [EASE_SYMMETRIC, EASE_SYMMETRIC] },
  );
  const logoRotateY = useTransform(
    progress,
    [T.WOBBLE_START, T.WOBBLE_PEAK, T.WOBBLE_END],
    [0, -4, 0],
    { ease: [EASE_SYMMETRIC, EASE_SYMMETRIC] },
  );

  // Swap putih → hitam saat zona navbar terbuka: logo harus tetap terlihat
  // di atas strip hero yang terang, dan menyamai warna wordmark asli.
  const logoLightOpacity = useTransform(
    progress,
    [T.REVEAL_START, T.REVEAL_END],
    [1, 0],
    { ease: EASE_SETTLE },
  );
  const logoDarkOpacity = useTransform(
    progress,
    [T.REVEAL_START, T.REVEAL_END],
    [0, 1],
    { ease: EASE_RISE },
  );

  // Handoff pixel-perfect: logo overlay (sudah parkir persis di atas wordmark)
  // fade out, wordmark navbar asli fade in — posisi/ukuran/tracking identik.
  const overlayLogoOpacity = useTransform(
    progress,
    [T.HANDOFF_START, T.HANDOFF_END],
    [1, 0],
    { ease: EASE_SETTLE },
  );
  const navbarLogoOpacity = useTransform(
    progress,
    [T.HANDOFF_START, T.HANDOFF_END],
    [0, 1],
    { ease: EASE_RISE },
  );

  // Mask zona navbar terbuka lebih dulu dari backdrop utama
  const navbarZoneOpacity = useTransform(
    progress,
    [T.REVEAL_START, T.REVEAL_END],
    [1, 0],
    { ease: EASE_SETTLE },
  );

  const mainOverlayOpacity = useTransform(
    progress,
    [T.BACKDROP_START, T.BACKDROP_END],
    [1, 0],
    { ease: EASE_SETTLE },
  );

  const scrollHintOpacity = useTransform(
    progress,
    [0, T.HINT_HOLD, T.HINT_GONE],
    [1, 1, 0],
    { ease: EASE_SETTLE },
  );

  // Tombol skip tetap terlihat selama morph, hilang saat reveal selesai
  const skipButtonOpacity = useTransform(
    progress,
    [T.REVEAL_END, T.HANDOFF_END],
    [1, 0],
    { ease: EASE_SETTLE },
  );

  useMotionValueEvent(progress, "change", (value) => {
    const done = value >= OPENING_COMPLETE_THRESHOLD;
    if (done === completeRef.current) return;
    completeRef.current = done;
    setIsComplete(done);
  });

  // Reset progress & state saat unmount (navigasi keluar home) — sehingga
  // saat user kembali/back & provider di-mount ulang, intro dimainkan
  // dari awal lagi (bukan terkunci di state complete).
  useEffect(() => {
    return () => {
      targetProgress.set(0);
      completeRef.current = false;
    };
  }, [targetProgress]);

  /**
   * Skip manual: animasikan targetProgress ke 1 (bukan native scroll).
   * Spring di progress menghaluskannya, bukan snap kasar.
   */
  const requestSkip = useCallback(() => {
    if (disabled || completeRef.current) return;
    if (prefersReducedMotion) {
      targetProgress.set(1);
      return;
    }
    const controls = animate(targetProgress, 1, {
      duration: 0.7,
      ease: [0.4, 0, 0.2, 1],
    });
    return () => controls.stop();
  }, [disabled, prefersReducedMotion, targetProgress]);

  return {
    overlayLogoRef,
    measure,
    progress,
    letterSpacing,
    radialOpacity,
    logoTranslateX,
    logoTranslateY,
    logoScale,
    logoRotateX,
    logoRotateY,
    logoLightOpacity,
    logoDarkOpacity,
    overlayLogoOpacity,
    navbarZoneOpacity,
    navbarLogoOpacity,
    mainOverlayOpacity,
    scrollHintOpacity,
    skipButtonOpacity,
    isComplete,
    prefersReducedMotion,
    requestSkip,
  };
}
