"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect } from "react";
import { DURATION_FAST, EASE_OUT } from "@/lib/motion";
import type { NotificationPayload } from "@/lib/notifications/types";

const TOAST_DURATION = 6000;

const EVENT_STYLE: Record<string, { bg: string; Icon: typeof Bell }> = {
  payment_success: { bg: "bg-emerald-600", Icon: CheckCircle2 },
  payment_expired: { bg: "bg-amber-600", Icon: AlertTriangle },
  order_cancelled: { bg: "bg-rose-600", Icon: XCircle },
};

export function NotificationToast({
  payload,
  onDismiss,
}: {
  payload: NotificationPayload | null;
  onDismiss: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!payload) return;
    const timer = window.setTimeout(onDismiss, TOAST_DURATION);
    return () => window.clearTimeout(timer);
  }, [payload, onDismiss]);

  const { bg, Icon } = EVENT_STYLE[payload?.event ?? ""] ?? {
    bg: "bg-zinc-800",
    Icon: Bell,
  };

  return (
    <AnimatePresence mode="wait">
      {payload && (
        <motion.div
          key={payload.id}
          role="status"
          aria-live="polite"
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 16, x: -24 }
          }
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, x: 0 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 8, x: -16 }
          }
          transition={{ duration: DURATION_FAST, ease: EASE_OUT }}
          className={`fixed z-[70] bottom-4 left-4 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-lg text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] ${bg}`}
        >
          <div className="flex items-start gap-3 px-4 py-3.5">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white/90" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug font-semibold">{payload.title}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-white/85">
                {payload.message}
              </p>
              {payload.externalId && (
                <Link
                  href="/account"
                  onClick={onDismiss}
                  className="mt-1.5 inline-block text-xs font-semibold text-white underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  Lihat pesanan
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Tutup notifikasi"
              className="shrink-0 rounded-sm text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <motion.div
            key={`progress-${payload.id}`}
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: TOAST_DURATION / 1000, ease: "linear" }}
            className="h-0.5 bg-white/50"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}