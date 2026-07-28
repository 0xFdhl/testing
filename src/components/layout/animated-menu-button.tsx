"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimatedMenuButtonProps = {
  open: boolean;
  onClick: () => void;
  className?: string;
};

const LINE_TRANSITION = { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const };

export function AnimatedMenuButton({
  open,
  onClick,
  className,
}: AnimatedMenuButtonProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      onClick={onClick}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
      className={cn(
        "relative z-10 flex h-9 w-9 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current md:hidden",
        className,
      )}
    >
      <span className="relative block h-4 w-5">
        <motion.span
          aria-hidden
          className="absolute left-0 h-[1.5px] w-5 origin-center rounded-full bg-current"
          initial={false}
          animate={
            open
              ? { top: 7, rotate: 45 }
              : { top: 2, rotate: 0 }
          }
          transition={prefersReducedMotion ? { duration: 0 } : LINE_TRANSITION}
        />
        <motion.span
          aria-hidden
          className="absolute left-0 top-[7px] h-[1.5px] w-5 rounded-full bg-current"
          initial={false}
          animate={
            open
              ? { opacity: 0, scaleX: 0 }
              : { opacity: 1, scaleX: 1 }
          }
          transition={prefersReducedMotion ? { duration: 0 } : LINE_TRANSITION}
        />
        <motion.span
          aria-hidden
          className="absolute left-0 h-[1.5px] w-5 origin-center rounded-full bg-current"
          initial={false}
          animate={
            open
              ? { top: 7, rotate: -45 }
              : { top: 12, rotate: 0 }
          }
          transition={prefersReducedMotion ? { duration: 0 } : LINE_TRANSITION}
        />
      </span>
    </motion.button>
  );
}
