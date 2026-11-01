"use client";

import { useEffect, useRef, useState } from "react";
import { NotificationToast } from "@/components/notifications/notification-toast";
import { playNotificationSound, unlockAudio } from "@/lib/notifications/sound";
import type { NotificationPayload } from "@/lib/notifications/types";

const POLL_INTERVAL_MS = 30_000;
const DEV_POLL_INTERVAL_MS = 5_000;

function isLocalHost(): boolean {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export function NotificationListener() {
  const [current, setCurrent] = useState<NotificationPayload | null>(null);
  const seenIds = useRef(new Set<string>());
  const sinceRef = useRef<string | null>(null);
  const firstLoad = useRef(true);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const unlock = () => unlockAudio();
    let isLoading = false;
    const seenKey = (payload: NotificationPayload) =>
      payload.externalId
        ? `${payload.event}:${payload.externalId}`
        : payload.id;
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        event?: NotificationPayload["event"];
        externalId?: string | null;
        sound?: string | null;
      };
      if (data?.type !== "admin-push-notification") return;
      if (data.event && data.externalId) {
        seenIds.current.add(`${data.event}:${data.externalId}`);
      }
      playNotificationSound(data.sound ?? null);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    const load = async () => {
      if (document.visibilityState !== "visible" || isLoading) return;
      isLoading = true;

      try {
        const query = sinceRef.current
          ? `?since=${encodeURIComponent(sinceRef.current)}`
          : "";
        const res = await fetch(`/api/notifications/poll${query}`);
        if (!res.ok) return;
        const { items, now } = (await res.json()) as {
          items: NotificationPayload[];
          now: string;
        };
        if (firstLoad.current) {
          firstLoad.current = false;
          sinceRef.current = now;
          return;
        }
        sinceRef.current = now;
        for (const payload of items) {
          const key = seenKey(payload);
          if (seenIds.current.has(key)) continue;
          seenIds.current.add(key);
          setCurrent(payload);
          playNotificationSound(payload.sound);
        }
      } catch {
        // jaringan terputus — coba lagi di interval berikutnya
      } finally {
        isLoading = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void load();
    };

    void load();
    const interval = isLocalHost() ? DEV_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
    timerRef.current = window.setInterval(load, interval);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, []);

  return <NotificationToast payload={current} onDismiss={() => setCurrent(null)} />;
}
