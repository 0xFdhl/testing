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

export function AdminPushNotificationToggle() {
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

      const save = await fetch("/api/admin/notifications/push/subscribe", {
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
        await fetch("/api/admin/notifications/push/unsubscribe", {
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
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-white">Device notifications</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Get a push notification on this device when a new order arrives or
            payment status changes, even when the admin panel is closed.
          </p>
        </div>
        {state === "granted" || state === "default" ? (
          <button
            type="button"
            onClick={state === "granted" ? disable : enable}
            disabled={busy}
            className="shrink-0 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            {state === "granted" ? "Disable" : "Enable"}
          </button>
        ) : null}
      </div>

      {state === "denied" && (
        <p className="mt-3 text-sm text-red-400">
          Blocked by browser. Allow notifications in your browser settings to
          enable them.
        </p>
      )}
      {state === "unsupported" && (
        <p className="mt-3 text-sm text-zinc-400">
          Not supported by this browser.
        </p>
      )}
      {state === "unconfigured" && (
        <p className="mt-3 text-sm text-zinc-400">
          Push notifications are not configured yet.
        </p>
      )}
      {state === "error" && (
        <p className="mt-3 text-sm text-red-400">
          Something went wrong. Try again.
        </p>
      )}
    </section>
  );
}