import type { LucideIcon } from "lucide-react";
import { GlassCard } from "./glass-card";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "var(--primary)",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4.5 shrink-0" style={{ color: accent }} aria-hidden />
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </GlassCard>
  );
}
