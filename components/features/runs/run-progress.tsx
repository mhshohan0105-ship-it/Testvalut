import { STATUS_BAR_CLASS, STATUS_ORDER, summarizeCounts, type StatusCounts } from "@/lib/constants/status";
import { STATUS_LABELS } from "@/lib/constants/testing";
import { cn } from "@/lib/utils";

export function RunProgress({ counts, className }: { counts: StatusCounts; className?: string }) {
  const { total } = summarizeCounts(counts);
  const label = STATUS_ORDER.filter((status) => counts[status])
    .map((status) => `${counts[status]} ${STATUS_LABELS[status].toLowerCase()}`)
    .join(", ");

  return (
    <div role="img" aria-label={total ? `Run progress: ${label}` : "This run has no cases"} className={cn("flex h-2 gap-px overflow-hidden rounded-full bg-muted", className)}>
      {STATUS_ORDER.map((status) => {
        const count = counts[status] ?? 0;
        if (!count) return null;
        return <span key={status} className={cn("h-full transition-[flex-grow] duration-300", STATUS_BAR_CLASS[status])} style={{ flexGrow: count, flexBasis: 0 }} />;
      })}
    </div>
  );
}
