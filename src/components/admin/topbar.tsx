"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { logoutAction } from "@/lib/admin-actions";

type AdminTopbarProps = {
  name: string;
  email: string;
};

export function AdminTopbar({ name, email }: AdminTopbarProps) {
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      try {
        if ("serviceWorker" in navigator) {
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
        }
      } catch {
        // push unsubscribe gagal — lanjut logout
      }
      await logoutAction();
    });
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 lg:px-6">
      <div className="pl-12 lg:pl-0">
        <p className="text-sm font-medium text-white">{name}</p>
        <p className="text-xs text-zinc-500">{email}</p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        <LogOut className="h-4 w-4" />
        {pending ? "Logging out…" : "Logout"}
      </button>
    </header>
  );
}