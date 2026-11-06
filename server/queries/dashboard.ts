import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { projectScope } from "./projects";

export async function getDashboardStats(user: CurrentUser) {
  const project = { archived: false, ...projectScope(user) };

  const [totalCases, activeRuns, statusGroups, openFailures] = await Promise.all([
    db.testCase.count({ where: { project } }),
    db.testRun.count({ where: { project, status: "ACTIVE" } }),
    db.testRunCase.groupBy({
      by: ["currentStatus"],
      where: { run: { project } },
      _count: { _all: true },
    }),
    db.testRunCase.count({ where: { currentStatus: "FAILED", run: { project, status: "ACTIVE" } } }),
  ]);

  const countOf = (status: string) => statusGroups.find((group) => group.currentStatus === status)?._count._all ?? 0;
  const passed = countOf("PASSED");
  const decided = passed + countOf("FAILED") + countOf("BLOCKED");

  return {
    totalCases,
    activeRuns,
    openFailures,
    passRate: decided === 0 ? null : Math.round((passed / decided) * 100),
  };
}
