"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { NavLinkItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

type MobileMenuDrawerProps = {
  open: boolean;
  onClose: () => void;
  links: NavLinkItem[];
  theme?: "light" | "dark";
};

export function MobileMenuDrawer({
  open,
  onClose,
  links,
  theme = "light",
}: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const isDark = theme === "dark";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed inset-y-0 left-0 z-[70] flex w-[min(80vw,320px)] flex-col px-6 pb-8 pt-[calc(var(--navbar-height)+1.5rem)] sm:w-[min(60vw,320px)] md:w-[min(45vw,380px)]",
              isDark ? "bg-[#0A0A0A] text-white" : "bg-[#f5f3ef] text-black",
            )}
          >
            <nav aria-label="Mobile menu">
              <ul className="flex flex-col gap-6">
                {links.map((link) => {
                  const active =
                    link.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(link.href);

                  return (
                    <li key={link.id}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className={cn(
                          "block rounded-sm py-2.5 text-sm font-semibold tracking-[0.2em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
                          active ? "opacity-100" : "opacity-50",
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
