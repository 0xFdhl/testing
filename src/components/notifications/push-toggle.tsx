"use client";

import { useEffect, useState } from "react";

type PushState =
  | "checking"
  | "unsupported"
  | "unconfigured"
  | "default"
  | "granted"
  | "denied"
  | "busy"
  | "error";

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output.buffer;
}

function getInitialPushState(): PushState {
  if (typeof window === "undefined") return "checking";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  return "checking";
}

export function PushNotificationToggle() {
  const [state, setState] = useState<PushState>(getInitialPushState);

  useEffect(() => {
    if (state !== "checking" || typeof window === "undefined") return;
    let cancelled = false;
    void fetch("/api/notifications/push/vapid-key")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { publicKey?: string } | null) => {
        if (cancelled) return;
        setState(!data?.publicKey ? "unconfigured" : Notification.permission);
      })
      .catch(() => {
        if (!cancelled) setState("unconfigured");
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  async function enable() {
    setState("busy");
    try {
      const res = await fetch("/api/notifications/push/vapid-key");
      if (!res.ok) {
        setState("unconfigured");
        return;
      }
      const { publicKey } = (await res.json()) as { publicKey: string };

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const subJson = subscription.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };

      const save = await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint ?? "",
          p256dh: subJson.keys?.p256dh ?? "",
          auth: subJson.keys?.auth ?? "",
          userAgent: navigator.userAgent,
        }),
      });
      if (!save.ok) {
        setState("error");
        return;
      }
      setState("granted");
    } catch {
      setState("error");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/notifications/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setState("default");
    } catch {
      setState("error");
    }
  }

  const busy = state === "busy" || state === "checking";

  return (
    <div className="rounded-lg border border-zinc-200 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-black">Browser notifications</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Get notified when your order status changes, even when the site is
            closed.
          </p>
        </div>
        {state === "granted" || state === "default" ? (
          <button
            type="button"
            onClick={state === "granted" ? disable : enable}
            disabled={busy}
            className="h-9 shrink-0 rounded-md bg-black px-4 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {state === "granted" ? "Disable" : "Enable"}
          </button>
        ) : null}
      </div>

      {state === "denied" && (
        <p className="mt-3 text-xs text-red-600">
          Blocked by browser. Allow notifications in your browser settings to
          enable them.
        </p>
      )}
      {state === "unsupported" && (
        <p className="mt-3 text-xs text-zinc-400">
          Not supported by this browser.
        </p>
      )}
      {state === "unconfigured" && (
        <p className="mt-3 text-xs text-zinc-400">
          Push notifications are not configured yet.
        </p>
      )}
      {state === "error" && (
        <p className="mt-3 text-xs text-red-600">
          Something went wrong. Try again.
        </p>
      )}
    </div>
  );
}