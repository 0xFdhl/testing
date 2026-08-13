"use client";

import { motion, type MotionValue } from "framer-motion";
import { useEffect, type RefObject } from "react";
import { useOpening } from "@/components/home/opening-provider";
import { OPENING_LOGO_TEXT } from "@/lib/opening-constants";
import { cn } from "@/lib/utils";

function OpeningLogo({
  letterSpacing,
  lightOpacity,
  darkOpacity,
  measureRef,
}: {
  letterSpacing: MotionValue<string>;
  lightOpacity: MotionValue<number>;
  darkOpacity: MotionValue<number>;
  measureRef: RefObject<HTMLDivElement | null>;
}) {
  const textClass =
    "block font-sans text-3xl font-bold leading-none lowercase sm:text-4xl md:text-5xl lg:text-[3.25rem]";

  return (
    // Font-size ditaruh di elemen pembungkus ini supaya terbaca oleh
    // getComputedStyle saat pengukuran morph (kebal transform framer).
    <div
      ref={measureRef}
      aria-hidden
      className={cn(textClass, "relative select-none whitespace-nowrap")}
    >
      <motion.span
        className={cn(textClass, "absolute inset-0 text-white")}
        style={{ letterSpacing, opacity: lightOpacity }}
      >
        {OPENING_LOGO_TEXT}
      </motion.span>
      <motion.span
        className={cn(textClass, "relative text-black")}
        style={{ letterSpacing, opacity: darkOpacity }}
      >
        {OPENING_LOGO_TEXT}
      </motion.span>
    </div>
  );
}

export function OpeningOverlay() {
  const opening = useOpening();

  const requestSkip = opening?.requestSkip;
  const skipIntro = opening?.skipIntro ?? true;
  const complete = opening?.isComplete ?? true;

  // Keyboard skip: Escape / Space → scroll halus ke akhir intro.
  // Listener hanya aktif selama intro berjalan & belum selesai.
  useEffect(() => {
    if (skipIntro || complete || !requestSkip) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== " ") return;
      // Jangan membajak ketikan di form field
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      requestSkip();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestSkip, skipIntro, complete]);

  // Intro diskip (session/reduced motion/tanpa provider) → tidak render
  // overlay sama sekali.
  if (!opening || opening.skipIntro) return null;

  const {
    overlayLogoRef,
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
    mainOverlayOpacity,
    scrollHintOpacity,
    skipButtonOpacity,
  } = opening;

  return (
    <>
      {/* Overlay murni fixed: TIDAK ada spacer. Body dikunci oleh hook
          selama intro aktif sehingga home di belakang diam total,
          dan dibuka begitu intro selesai (logo mendarat di navbar). */}
      <motion.div
        aria-hidden={complete}
        className="pointer-events-none fixed inset-0 z-[60]"
        style={complete ? { visibility: "hidden" } : undefined}
      >
        {/* Main backdrop — body only; navbar zone stays clear after reveal */}
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

        {/* Soft radial light — appears at RADIAL_IN */}
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

        {/* Morphing logo — center viewport → wordmark navbar */}
        <div
          className="absolute inset-0 z-[2] [perspective:900px]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Wrapper statis: pusatkan logo via CSS murni, sehingga transform
              framer di dalamnya murni delta hasil pengukuran (0 → dx/dy) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              className="origin-center"
              style={{
                x: logoTranslateX,
                y: logoTranslateY,
                scale: logoScale,
                rotateX: logoRotateX,
                rotateY: logoRotateY,
                opacity: overlayLogoOpacity,
                willChange: "transform, opacity",
              }}
            >
              <OpeningLogo
                measureRef={overlayLogoRef}
                letterSpacing={letterSpacing}
                lightOpacity={logoLightOpacity}
                darkOpacity={logoDarkOpacity}
              />
            </motion.div>
          </div>
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

        {/* Tombol skip — subtle, jelas saat hover/focus, satu-satunya
            elemen interaktif di overlay (pointer-events-auto) */}
        <motion.button
          type="button"
          aria-label="Lewati intro"
          onClick={requestSkip}
          className="pointer-events-auto absolute bottom-[max(1.75rem,env(safe-area-inset-bottom))] right-5 z-[4] rounded-sm px-3 py-2 text-[10px] font-semibold tracking-[0.32em] text-white/40 uppercase transition-colors duration-300 hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-8"
          style={{ opacity: skipButtonOpacity }}
        >
          Skip
        </motion.button>
      </motion.div>
    </>
  );
}
