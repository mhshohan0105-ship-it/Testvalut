import type { LucideIcon } from "lucide-react";
import { GlassCard } from "./glass-card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <GlassCard className="flex flex-col items-center px-6 py-16 text-center">
      <span className="glass mb-5 flex size-14 items-center justify-center rounded-2xl">
        <Icon className="size-6 text-primary" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </GlassCard>
  );
}
