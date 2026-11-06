import { ChevronDown, ChevronUp, ChevronsUp, Minus } from "lucide-react";
import type { Priority, TestStatus } from "@/generated/prisma/enums";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants/testing";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<Priority, { className: string; icon: typeof ChevronUp }> = {
  CRITICAL: { className: "text-status-failed bg-status-failed/12 border-status-failed/25", icon: ChevronsUp },
  HIGH: { className: "text-status-blocked bg-status-blocked/12 border-status-blocked/25", icon: ChevronUp },
  MEDIUM: { className: "text-status-retest bg-status-retest/12 border-status-retest/25", icon: Minus },
  LOW: { className: "text-status-untested bg-status-untested/12 border-status-untested/25", icon: ChevronDown },
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const { className: tone, icon: Icon } = PRIORITY_STYLES[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", tone, className)}>
      <Icon className="size-3" aria-hidden />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

const STATUS_STYLES: Record<TestStatus, string> = {
  PASSED: "text-status-passed bg-status-passed/12 border-status-passed/30",
  FAILED: "text-status-failed bg-status-failed/12 border-status-failed/30",
  BLOCKED: "text-status-blocked bg-status-blocked/12 border-status-blocked/30",
  RETEST: "text-status-retest bg-status-retest/12 border-status-retest/30",
  UNTESTED: "text-status-untested bg-status-untested/12 border-status-untested/30",
  SKIPPED: "text-status-skipped bg-status-skipped/12 border-status-skipped/30",
};

export function StatusBadge({ status, className }: { status: TestStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  );
}
