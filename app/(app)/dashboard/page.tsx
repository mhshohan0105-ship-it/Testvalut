import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CircleCheck, ListChecks, OctagonAlert } from "lucide-react";
import { ChartCard } from "@/components/features/charts/chart-card";
import { Donut, StackedArea } from "@/components/features/charts/lazy-charts";
import { ProgressOrb } from "@/components/features/dashboard/progress-orb";
import { RunProgress } from "@/components/features/runs/run-progress";
import { PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { GlassCard } from "@/components/ui/glass-card";
import { Reveal } from "@/components/ui/reveal";
import { StatCard } from "@/components/ui/stat-card";
import { requireUser } from "@/lib/auth/session";
import { STATUS_ORDER, summarizeCounts } from "@/lib/constants/status";
import { STATUS_LABELS } from "@/lib/constants/testing";
import { describeActivity } from "@/lib/utils/activity";
import { caseLabel, formatDateTime } from "@/lib/utils/format";
import { getDashboard } from "@/server/queries/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboard(user);
  const firstName = user.name.split(" ")[0];

  const donut = STATUS_ORDER.filter((status) => data.statusCounts[status]).map((status) => ({
    name: STATUS_LABELS[status],
    value: data.statusCounts[status] ?? 0,
    color: `var(--status-${status.toLowerCase()})`,
  }));
  const { total } = summarizeCounts(data.statusCounts);
  const area = data.daily.map((entry) => ({ ...entry, label: dayLabel.format(new Date(`${entry.day}T00:00:00Z`)) }));
  const series = [
    { key: "passed", name: "Passed", color: "var(--status-passed)" },
    { key: "failed", name: "Failed", color: "var(--status-failed)" },
    { key: "other", name: "Other", color: "var(--status-untested)" },
  ];

  return (
    <>
      <GlassCard className="mb-5 flex flex-col items-center gap-5 p-5 text-center sm:flex-row sm:text-left md:p-6">
        <ProgressOrb percent={data.passRate} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Welcome back, {firstName}</h1>
          <p className="mt-1.5 text-muted-foreground">Here&apos;s where testing stands across your projects.</p>
        </div>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total cases" value={data.totalCases} hint="Across all projects" icon={ListChecks} />
        <StatCard label="Active runs" value={data.activeRunCount} hint="In progress now" icon={Activity} accent="var(--status-retest)" />
        <StatCard
          label="Pass rate"
          value={data.passRate}
          suffix="%"
          hint="Passed out of passed, failed and blocked"
          icon={CircleCheck}
          accent="var(--status-passed)"
        />
        <StatCard label="Open failures" value={data.openFailures} hint="Failed in active runs" icon={OctagonAlert} accent="var(--status-failed)" />
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
        <ChartCard
          title="Cases by status"
          legend={donut.map((entry) => ({ label: entry.name, color: entry.color, value: entry.value }))}
          table={{ headers: ["Status", "Cases"], rows: donut.map((entry) => [entry.name, entry.value]) }}
        >
          {total === 0 ? <EmptyChart text="No runs yet." /> : <Donut data={donut} centerLabel="in runs" centerValue={total.toLocaleString("en-US")} />}
        </ChartCard>
        <ChartCard
          className="lg:col-span-2"
          title="Results, last 14 days"
          legend={series.map((entry) => ({ label: entry.name, color: entry.color }))}
          table={{ headers: ["Day", "Passed", "Failed", "Other"], rows: area.map((entry) => [entry.label, entry.passed, entry.failed, entry.other]) }}
        >
          <StackedArea data={area} series={series} />
        </ChartCard>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
        <Reveal>
          <GlassCard className="h-full p-5">
            <h2 className="font-semibold tracking-tight">Active run progress</h2>
            <ul className="mt-3 space-y-4">
              {data.activeRuns.map((run) => (
                <li key={run.id}>
                  <Link href={`/runs/${run.id}`} className="group block rounded-lg">
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="truncate font-medium group-hover:text-primary">{run.name}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{summarizeCounts(run.counts).percentDone}%</span>
                    </p>
                    <RunProgress counts={run.counts} className="mt-1.5" />
                  </Link>
                </li>
              ))}
              {data.activeRuns.length === 0 && <li className="text-sm text-muted-foreground">No active runs.</li>}
            </ul>
          </GlassCard>
        </Reveal>

        <Reveal>
          <GlassCard className="h-full p-5">
            <h2 className="font-semibold tracking-tight">
              My assigned tests <span className="ml-1 font-mono text-sm font-normal text-muted-foreground tabular-nums">{data.assignedTotal}</span>
            </h2>
            <ul className="mt-3 divide-y divide-border">
              {data.assigned.map((item) => (
                <li key={item.id}>
                  <Link href={`/runs/${item.runId}/execute?case=${item.id}`} className="group block py-2">
                    <p className="truncate text-sm font-medium group-hover:text-primary">{item.testCase.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-mono">{caseLabel(item.testCase.caseNumber)}</span>
                      <PriorityBadge priority={item.testCase.priority} />
                      <StatusBadge status={item.currentStatus} />
                      <span className="truncate">{item.run.name}</span>
                    </p>
                  </Link>
                </li>
              ))}
              {data.assigned.length === 0 && <li className="py-2 text-sm text-muted-foreground">Nothing is waiting on you.</li>}
            </ul>
          </GlassCard>
        </Reveal>

        <Reveal>
          <GlassCard className="h-full p-5">
            <h2 className="font-semibold tracking-tight">Recent activity</h2>
            <ul className="mt-3 space-y-3">
              {data.activity.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <p className="break-words">
                    <span className="font-medium">{entry.user.name}</span> {describeActivity(entry)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">{entry.project.key}</span> · {formatDateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
              {data.activity.length === 0 && <li className="text-sm text-muted-foreground">Nothing has happened yet.</li>}
            </ul>
          </GlassCard>
        </Reveal>
      </div>
    </>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">{text}</p>;
}
