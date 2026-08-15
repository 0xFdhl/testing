"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

const SW_PATH = "/sw.js";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function PushSubscriptionManager() {
  const { data: session, status } = useSession();
  const userId = status === "authenticated" ? (session?.user?.id ?? null) : null;

  useEffect(() => {
    if (!userId) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;

    async function subscribe() {
      try {
        if (Notification.permission === "denied") return;

        const registration = await navigator.serviceWorker.register(SW_PATH);

        if (Notification.permission === "granted") {
          const existing = await registration.pushManager.getSubscription();
          if (existing) return;
        }

        const res = await fetch("/api/notifications/push/vapid-key");
        if (!res.ok) return;
        const { publicKey } = (await res.json()) as { publicKey?: string };
        if (!publicKey) return;

        const permission =
          Notification.permission === "granted"
            ? Notification.permission
            : await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        if (cancelled) return;
        await fetch("/api/notifications/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            p256dh: btoa(
              String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!)),
            ),
            auth: btoa(
              String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!)),
            ),
            userAgent: navigator.userAgent,
          }),
        });
      } catch {
        // push tidak tersedia — abaikan
      }
    }

    void subscribe();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}