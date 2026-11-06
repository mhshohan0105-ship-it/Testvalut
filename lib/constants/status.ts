import type { TestStatus } from "@/generated/prisma/enums";

/** Order used by progress bars and status counts. */
export const STATUS_ORDER: TestStatus[] = ["PASSED", "FAILED", "BLOCKED", "RETEST", "SKIPPED", "UNTESTED"];

export const STATUS_BAR_CLASS: Record<TestStatus, string> = {
  PASSED: "bg-status-passed",
  FAILED: "bg-status-failed",
  BLOCKED: "bg-status-blocked",
  RETEST: "bg-status-retest",
  SKIPPED: "bg-status-skipped",
  UNTESTED: "bg-status-untested/35",
};

export type StatusCounts = Partial<Record<TestStatus, number>>;

export function summarizeCounts(counts: StatusCounts) {
  const total = STATUS_ORDER.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  const untested = counts.UNTESTED ?? 0;
  const passed = counts.PASSED ?? 0;
  return {
    total,
    done: total - untested,
    percentDone: total === 0 ? 0 : Math.round(((total - untested) / total) * 100),
    percentPassed: total === 0 ? 0 : Math.round((passed / total) * 100),
  };
}
