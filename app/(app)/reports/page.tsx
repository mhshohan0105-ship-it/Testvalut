import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Download } from "lucide-react";
import { ChartCard } from "@/components/features/charts/chart-card";
import { Bars, Donut, TrendLine } from "@/components/features/charts/lazy-charts";
import { PrintButton } from "@/components/features/reports/print-button";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NativeSelect } from "@/components/ui/form-controls";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth/session";
import { STATUS_ORDER, summarizeCounts } from "@/lib/constants/status";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants/testing";
import { cn } from "@/lib/utils";
import { parseDateRange, type DateRange } from "@/lib/utils/date-range";
import { caseLabel, formatDate, formatDateTime, formatDuration } from "@/lib/utils/format";
import { getActiveProject } from "@/server/queries/projects";
import { getProjectReport, getReportRunOptions, getRunReport } from "@/server/queries/reports";
import { getRun, getRunStatusCounts } from "@/server/queries/runs";

export const metadata: Metadata = { title: "Reports" };

const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string; run?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const user = await requireUser();
  const project = await getActiveProject(user);

  if (!project) {
    return (
      <>
        <PageHeader title="Reports" description="Run summaries and project trends." />
        <EmptyState
          icon={BarChart3}
          title="No project to show"
          description="Reports cover a project. Create one, or ask an admin to add you to one."
          action={
            <Button asChild>
              <Link href="/projects">Go to projects</Link>
            </Button>
          }
        />
      </>
    );
  }

  const range = parseDateRange(params.from, params.to);
  const tab = params.tab === "run" ? "run" : "project";
  const runs = await getReportRunOptions(project.id);
  const selectedRun = runs.find((run) => run.id === params.run) ?? runs[0];
  const dates = `from=${range.fromDay}&to=${range.toDay}`;
  const exportHref =
    tab === "project"
      ? `/api/projects/${project.id}/reports/export?${dates}`
      : selectedRun
        ? `/api/runs/${selectedRun.id}/report/export?${dates}`
        : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Reports" description={`${project.name} · ${formatDate(range.start)} to ${formatDate(`${range.toDay}T00:00:00Z`)}`} />
        <div className="flex flex-wrap gap-2 print:hidden">
          {exportHref && (
            <Button asChild variant="outline">
              <a href={exportHref} download>
                <Download /> Export CSV
              </a>
            </Button>
          )}
          <PrintButton />
        </div>
      </div>

      <nav aria-label="Report type" className="mb-4 flex gap-1 border-b border-border print:hidden">
        {[
          { id: "project", label: "Project", href: `/reports?${dates}` },
          { id: "run", label: "Run summary", href: `/reports?tab=run&${dates}${selectedRun ? `&run=${selectedRun.id}` : ""}` },
        ].map((entry) => (
          <Link
            key={entry.id}
            href={entry.href}
            aria-current={tab === entry.id ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors", tab === entry.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      <form method="get" action="/reports" className="mb-5 flex flex-wrap items-end gap-3 print:hidden">
        {tab === "run" && <input type="hidden" name="tab" value="run" />}
        {tab === "run" && (
          <div className="min-w-48 flex-1 sm:max-w-sm">
            <Label htmlFor="report-run" className="mb-1.5">Run</Label>
            <NativeSelect id="report-run" name="run" className="h-9" defaultValue={selectedRun?.id}>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.name}
                  {run.status === "COMPLETED" ? " (closed)" : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
        <div>
          <Label htmlFor="report-from" className="mb-1.5">From</Label>
          <Input id="report-from" name="from" type="date" defaultValue={range.fromDay} className="rounded-xl" />
        </div>
        <div>
          <Label htmlFor="report-to" className="mb-1.5">To</Label>
          <Input id="report-to" name="to" type="date" defaultValue={range.toDay} className="rounded-xl" />
        </div>
        <Button type="submit">Apply</Button>
      </form>

      {tab === "project" ? (
        <ProjectReport projectId={project.id} range={range} />
      ) : selectedRun ? (
        <RunReport runId={selectedRun.id} range={range} />
      ) : (
        <EmptyState icon={BarChart3} title="No runs yet" description="Run reports appear once this project has a test run." />
      )}
    </>
  );
}

async function ProjectReport({ projectId, range }: { projectId: string; range: DateRange }) {
  const report = await getProjectReport(projectId, range);
  const trend = report.trend.map((row) => ({ ...row, label: dayLabel.format(new Date(`${row.day}T00:00:00Z`)) }));
  const priorities = report.priorities.map((row) => ({ label: PRIORITY_LABELS[row.priority], value: row.count }));

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <GlassCard className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Pass rate in this period</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">{report.passRate === null ? "–" : `${report.passRate}%`}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Results recorded</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">{report.results.toLocaleString("en-US")}</p>
        </GlassCard>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-3"
          title="Pass rate trend"
          table={{ headers: ["Day", "Pass rate", "Decided results"], rows: trend.map((row) => [row.label, row.passRate === null ? "–" : `${row.passRate}%`, row.results]) }}
        >
          {trend.length === 0 ? <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No results in this period.</p> : <TrendLine data={trend} />}
        </ChartCard>
        <ChartCard className="lg:col-span-2" title="Cases by priority" table={{ headers: ["Priority", "Cases"], rows: priorities.map((row) => [row.label, row.value]) }}>
          <Bars data={priorities} name="Cases" />
        </ChartCard>
      </div>
      <GlassCard className="mt-5 p-5 print:break-inside-avoid">
        <h2 className="font-semibold tracking-tight">Most failing cases</h2>
        {report.mostFailing.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing failed in this period.</p>
        ) : (
          <ol className="mt-3 divide-y divide-border">
            {report.mostFailing.map((row) => (
              <li key={row.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{caseLabel(row.caseNumber)}</span>
                <Link href={`/cases/${row.id}?tab=results`} className="min-w-0 flex-1 truncate font-medium hover:text-primary">
                  {row.title}
                </Link>
                <span className="shrink-0 font-mono text-xs tabular-nums">{row.failures} {row.failures === 1 ? "failure" : "failures"}</span>
              </li>
            ))}
          </ol>
        )}
      </GlassCard>
    </>
  );
}

async function RunReport({ runId, range }: { runId: string; range: DateRange }) {
  const [run, counts, report] = await Promise.all([getRun(runId), getRunStatusCounts(runId), getRunReport(runId, range)]);
  if (!run) return null;
  const donut = STATUS_ORDER.filter((status) => counts[status]).map((status) => ({
    name: STATUS_LABELS[status],
    value: counts[status] ?? 0,
    color: `var(--status-${status.toLowerCase()})`,
  }));
  const { total, percentPassed } = summarizeCounts(counts);

  return (
    <>
      <h2 className="mb-3 text-lg font-semibold tracking-tight">
        <Link href={`/runs/${run.id}`} className="hover:text-primary">{run.name}</Link>
        {run.environment && <span className="ml-2 text-sm font-normal text-muted-foreground">{run.environment}</span>}
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-2"
          title="Status breakdown"
          legend={donut.map((entry) => ({ label: entry.name, color: entry.color, value: entry.value }))}
          table={{ headers: ["Status", "Cases"], rows: donut.map((entry) => [entry.name, entry.value]) }}
        >
          {total === 0 ? <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">No cases.</p> : <Donut data={donut} centerLabel="passed" centerValue={`${percentPassed}%`} />}
        </ChartCard>
        <GlassCard className="p-5 lg:col-span-3 print:break-inside-avoid">
          <h2 className="font-semibold tracking-tight">By tester</h2>
          {report.testers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No results in this period.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    {["Tester", "Results", "Passed", "Failed", "Blocked", "Time"].map((heading) => (
                      <th key={heading} scope="col" className="py-1.5 pr-4 font-medium">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-xs tabular-nums">
                  {report.testers.map((tester) => (
                    <tr key={tester.name}>
                      <td className="py-2 pr-4 font-sans text-sm font-medium">{tester.name}</td>
                      <td className="py-2 pr-4">{tester.total}</td>
                      <td className="py-2 pr-4">{tester.passed}</td>
                      <td className="py-2 pr-4">{tester.failed}</td>
                      <td className="py-2 pr-4">{tester.blocked}</td>
                      <td className="py-2 pr-4">{formatDuration(tester.seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
      <GlassCard className="mt-5 p-5">
        <h2 className="font-semibold tracking-tight">
          Failures <span className="ml-1 font-mono text-sm font-normal text-muted-foreground tabular-nums">{report.failureTotal}</span>
        </h2>
        {report.failures.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No failed or blocked cases in this period.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {report.failures.map((failure) => (
              <li key={failure.id} className="py-3 text-sm print:break-inside-avoid">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{caseLabel(failure.testCase.caseNumber)}</span>
                  <Link href={`/runs/${run.id}/execute?case=${failure.id}`} className="font-medium hover:text-primary">{failure.testCase.title}</Link>
                  <StatusBadge status={failure.currentStatus} />
                  <PriorityBadge priority={failure.testCase.priority} />
                  {failure.latest?.defectRef && <span className="font-mono text-xs">{failure.latest.defectRef}</span>}
                </p>
                {failure.latest?.comment && <p className="mt-1 whitespace-pre-wrap">{failure.latest.comment}</p>}
                {failure.latest?.actualResult && (
                  <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">
                    <span className="font-medium">Actual:</span> {failure.latest.actualResult}
                  </p>
                )}
                {failure.latest && <p className="mt-1 text-xs text-muted-foreground">{failure.latest.createdBy.name} · {formatDateTime(failure.latest.createdAt)}</p>}
              </li>
            ))}
          </ul>
        )}
        {report.failureTotal > report.failures.length && <p className="mt-3 text-xs text-muted-foreground">Showing the first {report.failures.length}. Export the CSV for the complete list up to that limit, or narrow the dates.</p>}
      </GlassCard>
    </>
  );
}
