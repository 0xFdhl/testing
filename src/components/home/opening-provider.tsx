"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { motionValue, useReducedMotion } from "framer-motion";
import {
  useOpeningScroll,
  type OpeningHookResult,
} from "@/hooks/use-opening-scroll";

/** Flag "intro sudah dilihat" disimpan per tab session (sessionStorage):
 *  intro hanya diputar saat pertama kali user masuk. Klik home lagi
 *  (navigasi kembali) → flag sudah ada → intro diskip instant. */
const OPENING_SEEN_KEY = "varcasvi-opening-seen";

/** Gate statis terbuka penuh — dipakai saat intro diskip (instant, tanpa animasi) */
const GATE_OPEN = motionValue(1);

function hasSeenOpening(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(OPENING_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markOpeningSeen(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(OPENING_SEEN_KEY, "1");
  } catch {
    // sessionStorage tidak tersedia (mode privat, dll) — abaikan
  }
}

// useSyncExternalStore: server snapshot selalu false (belum lihat) agar cocok
// dengan SSR; client membaca sessionStorage hanya SETELAH hydration → tidak
// ada hydration mismatch.
const noopSubscribe = () => () => {};
const readOpeningSeen = () => hasSeenOpening();
const serverOpeningSeen = () => false;

export interface OpeningContextValue extends OpeningHookResult {
  /** Daftarkan elemen wordmark navbar sebagai target pendaratan morph */
  registerTarget: (el: HTMLElement | null) => void;
  /** true → intro diskip total (session/reduced motion) */
  skipIntro: boolean;
}

const OpeningContext = createContext<OpeningContextValue | null>(null);

/**
 * null bila dipakai di luar provider (halaman tanpa intro) —
 * konsumen (mis. navbar) harus fallback ke perilaku normal.
 */
export function useOpening(): OpeningContextValue | null {
  return useContext(OpeningContext);
}

/**
 * Membungkus OpeningOverlay + Navbar di homepage. Intro DIPUTAR SATU KALI
 * per tab session — saat pertama user mendarat di home. Setelah intro
 * selesai (atau diskip), flag ditandai di sessionStorage sehingga navigasi
 * kembali ke home (klik home / back) langsung skip intro tanpa replay.
 * prefers-reduced-motion selalu skip.
 */
export function OpeningProvider({ children }: { children: ReactNode }) {
  const targetRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  // seen dievaluasi via useSyncExternalStore: false saat SSR & render awal
  // client (konsisten, tidak trigger hydration mismatch), lalu membaca
  // sessionStorage setelah hydration. Intro hanya diputar bila belum pernah
  // dilihat di tab session ini.
  const seen = useSyncExternalStore(
    noopSubscribe,
    readOpeningSeen,
    serverOpeningSeen,
  );

  // skip bila sudah pernah lihat intro tab ini atau minta reduced motion.
  // Tidak ada lagi replay tiap mendarat di home.
  const skipIntro = prefersReducedMotion === true || seen;

  const values = useOpeningScroll(targetRef, skipIntro);
  const { measure, isComplete } = values;

  // Begitu intro selesai → tandai sudah dilihat (side-effect ke sessionStorage,
  // supaya mount berikutnya skip). Tidak perlu setState: flag sudah cukup.
  useEffect(() => {
    if (isComplete) markOpeningSeen();
  }, [isComplete]);

  const registerTarget = useCallback(
    (el: HTMLElement | null) => {
      targetRef.current = el;
      // Ukur ulang begitu target tersedia/berubah
      measure();
    },
    [measure],
  );

  // Saat skip: paksa state final instant — gate wordmark navbar terbuka penuh,
  // isComplete true, tanpa transisi/flash. Overlay sendiri tidak dirender.
  const context: OpeningContextValue = skipIntro
    ? {
        ...values,
        navbarLogoOpacity: GATE_OPEN,
        isComplete: true,
        registerTarget,
        skipIntro,
      }
    : { ...values, registerTarget, skipIntro };

  return (
    <OpeningContext.Provider value={context}>
      {children}
    </OpeningContext.Provider>
  );
}