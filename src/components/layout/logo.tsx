import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  /** light = putih di header gelap | dark = hitam di hero terang */
  variant?: "light" | "dark";
  className?: string;
  size?: "default" | "compact";
};

export function Logo({ variant = "light", className, size = "default" }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "relative block shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
        className,
      )}
      aria-label="varcasvi_ home"
    >
      <span
        className={cn(
          "block font-sans font-bold leading-none tracking-[-0.04em] lowercase",
          size === "compact"
            ? "text-2xl sm:text-[1.65rem] md:text-3xl"
            : "text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem]",
          variant === "light" ? "text-white" : "text-black",
        )}
      >
        varcasvi_
      </span>
    </Link>
  );
}
