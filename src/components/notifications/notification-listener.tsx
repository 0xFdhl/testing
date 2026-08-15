"use client";

import { useEffect, useState } from "react";
import { NotificationToast } from "@/components/notifications/notification-toast";
import { playNotificationSound, unlockAudio } from "@/lib/notifications/sound";
import type { NotificationPayload } from "@/lib/notifications/types";

export function NotificationListener() {
  const [current, setCurrent] = useState<NotificationPayload | null>(null);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    const source = new EventSource("/api/notifications/stream");

    source.addEventListener("notification", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as NotificationPayload;
        setCurrent(payload);
        playNotificationSound(payload.sound);
      } catch {
        // payload tidak valid — abaikan
      }
    });

    return () => {
      source.close();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return <NotificationToast payload={current} onDismiss={() => setCurrent(null)} />;
}