import type { LucideIcon } from "lucide-react";
import { CountUp } from "./count-up";
import { TiltCard } from "./tilt-card";

export function StatCard({
  label,
  value,
  suffix,
  hint,
  icon: Icon,
  accent = "var(--primary)",
}: {
  label: string;
  /** null shows a dash, for numbers that don't exist yet, such as a pass rate with no results. */
  value: number | null;
  suffix?: string;
  hint?: string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <TiltCard className="h-full">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className="size-4.5 shrink-0" style={{ color: accent }} aria-hidden />
        </div>
        <p className="mt-3 font-mono text-3xl font-semibold tracking-tight tabular-nums">{value === null ? "–" : <CountUp value={value} suffix={suffix} />}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </TiltCard>
  );
}
