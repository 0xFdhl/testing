"use client";

import { useEffect, useRef, useState } from "react";
import { NotificationToast } from "@/components/notifications/notification-toast";
import { playNotificationSound, unlockAudio } from "@/lib/notifications/sound";
import type { NotificationPayload } from "@/lib/notifications/types";

const POLL_INTERVAL_MS = 10_000;
const DEV_POLL_INTERVAL_MS = 5_000;

function isLocalHost(): boolean {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export function NotificationListener() {
  const [current, setCurrent] = useState<NotificationPayload | null>(null);
  const seenIds = useRef(new Set<string>());
  const sinceRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    const load = async () => {
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
        sinceRef.current = now;
        for (const payload of items) {
          if (seenIds.current.has(payload.id)) continue;
          seenIds.current.add(payload.id);
          setCurrent(payload);
          playNotificationSound(payload.sound);
        }
      } catch {
        // jaringan terputus — coba lagi di interval berikutnya
      }
    };

    void load();
    const interval = isLocalHost() ? DEV_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
    timerRef.current = window.setInterval(load, interval);

    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return <NotificationToast payload={current} onDismiss={() => setCurrent(null)} />;
}