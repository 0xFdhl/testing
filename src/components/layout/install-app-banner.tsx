"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

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

export function InstallAppBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    function handlePrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  const visible = !dismissed && !isStandalone() && (promptEvent !== null || (isIos() && showIos));
  if (!visible) return null;

  async function handleInstall() {
    if (promptEvent) {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      setPromptEvent(null);
    } else {
      setShowIos(true);
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-zinc-800 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Close"
        className="absolute right-2 top-2 rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Install varcasvi_ app</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {isIos() && !promptEvent
              ? "Tap Share, then Add to Home Screen."
              : "Get push notifications and faster access."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="ml-auto shrink-0 rounded-lg bg-white px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-100"
        >
          Install
        </button>
      </div>
    </div>
  );
}