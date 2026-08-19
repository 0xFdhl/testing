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
  | "error"
  | "ios-install";

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

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getInitialPushState(): PushState {
  if (typeof window === "undefined") return "checking";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  return "checking";
}

async function getAdminRegistration(): Promise<ServiceWorkerRegistration | null> {
  const byScope = await navigator.serviceWorker.getRegistration("/admin/");
  if (byScope) return byScope;
  const active = await navigator.serviceWorker.ready;
  return active;
}

export function AdminPushNotificationToggle() {
  const [state, setState] = useState<PushState>(getInitialPushState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "checking" || typeof window === "undefined") return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/notifications/push/vapid-key");
        if (!res.ok) {
          if (!cancelled) setState("unconfigured");
          return;
        }
        const data = (await res.json()) as { publicKey?: string };
        if (!data?.publicKey) {
          if (!cancelled) setState("unconfigured");
          return;
        }
        if (isIos() && !isStandalone()) {
          if (!cancelled) setState("ios-install");
          return;
        }
        if (Notification.permission === "granted") {
          try {
            const registration = await getAdminRegistration();
            const subscription = await registration?.pushManager.getSubscription();
            if (subscription) {
              if (!cancelled) setState("granted");
              return;
            }
          } catch {
            // no active registration yet — fall through to permission state
          }
        }
        if (!cancelled) setState(Notification.permission);
      } catch {
        if (!cancelled) setState("unconfigured");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state]);

  async function enable() {
    if (isIos() && !isStandalone()) {
      setState("ios-install");
      return;
    }
    setState("busy");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/notifications/push/vapid-key");
      if (!res.ok) {
        setState("unconfigured");
        return;
      }
      const { publicKey } = (await res.json()) as { publicKey: string };

      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") {
        setErrorMessage(
          "Notification permission was not granted. Allow notifications for this site in your browser settings.",
        );
        setState("denied");
        return;
      }

      const registration = await navigator.serviceWorker.register("/admin/sw.js", {
        scope: "/admin/",
      });
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
        if (save.status === 401) {
          setErrorMessage(
            "Not signed in as admin. Log in again and retry enabling notifications.",
          );
        } else {
          setErrorMessage(
            "Could not save the subscription on the server. Try again in a moment.",
          );
        }
        setState("error");
        return;
      }
      setState("granted");
    } catch (err) {
      const name = (err as { name?: string })?.name;
      const message = (err as { message?: string })?.message ?? "";
      if (name === "SecurityError" || /insecure|secure origin/i.test(message)) {
        setErrorMessage(
          "Push notifications require HTTPS. Open this site over a secure connection.",
        );
      } else if (name === "NotAllowedError" || name === "AbortError") {
        setErrorMessage(
          "Notification permission was blocked. Allow notifications for this site and try again.",
        );
      } else {
        setErrorMessage(
          `Could not enable push notifications (${name || message}). Try again.`,
        );
      }
      setState("error");
    }
  }

  async function disable() {
    setState("busy");
    setErrorMessage(null);
    try {
      const registration = await getAdminRegistration();
      const subscription = await registration?.pushManager.getSubscription();
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
      setErrorMessage("Could not disable notifications. Try again.");
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
          {errorMessage ??
            "Blocked by browser. Allow notifications in your browser settings to enable them."}
        </p>
      )}
      {state === "ios-install" && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <p className="font-medium">Install the admin app to enable notifications.</p>
          <p className="mt-1 text-xs">
            On iPhone: tap Share, then Add to Home Screen. Open the installed
            varcasvi_ Admin app and enable notifications here.
          </p>
        </div>
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
          {errorMessage ?? "Something went wrong. Try again."}
        </p>
      )}
    </section>
  );
}
