import type { Metadata } from "next";
import { Activity, CircleCheck, ListChecks, OctagonAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { requireUser } from "@/lib/auth/session";
import { getDashboardStats } from "@/server/queries/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = await getDashboardStats(user);
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader title={`Welcome back, ${firstName}`} description="Here's where testing stands across your projects." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total cases" value={stats.totalCases.toLocaleString("en-US")} hint="Across all projects" icon={ListChecks} />
        <StatCard label="Active runs" value={String(stats.activeRuns)} hint="In progress now" icon={Activity} accent="var(--status-retest)" />
        <StatCard
          label="Pass rate"
          value={stats.passRate === null ? "–" : `${stats.passRate}%`}
          hint="Passed out of passed, failed and blocked"
          icon={CircleCheck}
          accent="var(--status-passed)"
        />
        <StatCard label="Open failures" value={String(stats.openFailures)} hint="Failed in active runs" icon={OctagonAlert} accent="var(--status-failed)" />
      </div>
    </>
  );
}
