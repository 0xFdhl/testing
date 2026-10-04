import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
  icon?: React.ReactNode;
  accent?: "gold" | "violet" | "sky" | "emerald";
};

const accentClasses = {
  gold: "border-brand-gold/20 bg-brand-gold/10 text-brand-gold",
  violet: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  sky: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
};

export function StatCard({
  title,
  value,
  subtitle,
  className,
  icon,
  accent = "gold",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-white">
            {value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
              accentClasses[accent],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
