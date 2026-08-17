"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const COLOR_TRANSITION_CLASS =
  "transition-colors duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]";

function NavUserIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      className={cn("h-[18px] w-[18px]", className)}
    >
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.25" />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
        d="M4.5 16.5c.9-2.8 3.1-4.5 5.5-4.5s4.6 1.7 5.5 4.5"
      />
    </svg>
  );
}

function UserAvatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name ?? "User"}
        onError={() => setImgError(true)}
        className={cn("h-[22px] w-[22px] rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/10 text-[11px] font-semibold",
        className,
      )}
    >
      {initial}
    </span>
  );
}

type MenuPosition = {
  top: number;
  right: number;
};

export function UserMenu({ isLight }: { isLight: boolean }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8, // 8px gap, sama kayak mt-2 sebelumnya
      right: window.innerWidth - rect.right,
    });
  }, []);

  const handleToggle = useCallback(() => {
    if (status === "loading") return;
    setOpen((prev) => {
      const next = !prev;
      if (next) updatePosition();
      return next;
    });
  }, [status, updatePosition]);

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    try {
      if ("serviceWorker" in navigator) {
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
      }
    } catch {
      // push unsubscribe gagal — lanjut sign out
    }
    await signOut({ callbackUrl: "/" });
  }, []);

  // Recalculate position on scroll/resize while open
  useEffect(() => {
    if (!open) return;

    function handleReposition() {
      updatePosition();
    }

    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, updatePosition]);

  // Close on click outside (cek trigger wrapper DAN menu, karena menu sekarang portal-like via fixed, bukan child dari wrapper secara visual)
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedTrigger = wrapperRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      {status === "loading" ? (
        <div
          className={cn(
            "h-[22px] w-[22px] animate-pulse rounded-full",
            isLight ? "bg-black/20" : "bg-white/20",
          )}
        />
      ) : status === "authenticated" ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            aria-label={`Account: ${session.user?.name ?? "User"}`}
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={handleToggle}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-current",
              COLOR_TRANSITION_CLASS,
              isLight ? "text-black/90 hover:text-black" : "text-white/90 hover:text-white",
              open && (isLight ? "bg-black/5" : "bg-white/10"),
            )}
          >
            <UserAvatar
              src={session.user?.image}
              name={session.user?.name}
              className={cn(
                "ring-1 ring-offset-[2px]",
                isLight ? "ring-black/15 ring-offset-white" : "ring-white/20 ring-offset-black",
              )}
            />
            <span className="hidden max-w-[100px] truncate text-[11px] font-semibold tracking-[0.22em] md:inline">
              {session.user?.name?.toUpperCase()}
            </span>
            <ChevronDown
              className={cn(
                "hidden h-3.5 w-3.5 transition-transform duration-200 md:inline",
                open && "rotate-180",
              )}
              strokeWidth={2}
            />
          </button>

          <AnimatePresence>
            {open && position && (
              <motion.div
                ref={menuRef}
                role="menu"
                initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{
                  transformOrigin: "top right",
                  position: "fixed",
                  top: position.top,
                  right: position.right,
                }}
                className={cn(
                  "z-[100] w-56 overflow-hidden rounded-xl border py-1 shadow-lg backdrop-blur-xl",
                  isLight
                    ? "border-black/10 bg-white/95 text-black"
                    : "border-white/10 bg-zinc-900/95 text-white",
                )}
              >
                <div className="border-b px-4 py-3">
                  <p className="truncate text-sm font-medium">
                    {session.user?.name}
                  </p>
                  <p className="truncate text-xs opacity-60">
                    {session.user?.email}
                  </p>
                </div>

                <Link
                  href="/account"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
                    isLight
                      ? "hover:bg-black/5 focus-visible:ring-black"
                      : "hover:bg-white/5 focus-visible:ring-white",
                  )}
                >
                  <UserIcon className="h-4 w-4 opacity-60" strokeWidth={1.5} />
                  My Account
                </Link>

                <div className={cn("my-1 border-t", isLight ? "border-black/10" : "border-white/10")} />

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
                    isLight
                      ? "hover:bg-black/5 focus-visible:ring-black"
                      : "hover:bg-white/5 focus-visible:ring-white",
                  )}
                >
                  <LogOut className="h-4 w-4 opacity-60" strokeWidth={1.5} />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <Link
          href="/login"
          aria-label="Sign in"
          className={cn(
            "flex items-center gap-1.5 rounded-full px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
            COLOR_TRANSITION_CLASS,
            isLight ? "text-black/90 hover:text-black hover:bg-black/5" : "text-white/90 hover:text-white hover:bg-white/10",
          )}
        >
          <NavUserIcon />
          <span className="hidden text-[11px] font-semibold tracking-[0.22em] md:inline">
            SIGN IN
          </span>
        </Link>
      )}
    </div>
  );
}