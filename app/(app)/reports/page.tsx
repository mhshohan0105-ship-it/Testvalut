import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Download } from "lucide-react";
import { ChartCard } from "@/components/features/charts/chart-card";
import { Bars, Donut, TrendLine } from "@/components/features/charts/lazy-charts";
import { PrintButton } from "@/components/features/reports/print-button";
import { RunProgress } from "@/components/features/runs/run-progress";
import { PageHeader } from "@/components/layout/page-header";
import { BugStatusBadge, StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NativeSelect } from "@/components/ui/form-controls";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth/session";
import { STATUS_ORDER, summarizeCounts } from "@/lib/constants/status";
import { CASE_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants/testing";
import { cn } from "@/lib/utils";
import { parseDateRange, type DateRange } from "@/lib/utils/date-range";
import { caseLabel, formatDate, formatDateTime, formatDuration } from "@/lib/utils/format";
import { getActiveProject } from "@/server/queries/projects";
import { getProjectInsights } from "@/server/queries/report-insights";
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
  const [report, insights] = await Promise.all([getProjectReport(projectId, range), getProjectInsights(projectId, range)]);
  const trend = report.trend.map((row) => ({ ...row, label: dayLabel.format(new Date(`${row.day}T00:00:00Z`)) }));
  const priorities = report.priorities.map((row) => ({ label: PRIORITY_LABELS[row.priority], value: row.count }));
  const types = insights.types.map((row) => ({ label: CASE_TYPE_LABELS[row.type], value: row.count }));
  const results = STATUS_ORDER.filter((status) => insights.statusCounts[status]).map((status) => ({
    name: STATUS_LABELS[status],
    value: insights.statusCounts[status] ?? 0,
    color: `var(--status-${status.toLowerCase()})`,
  }));
  const activeBugs = insights.bugs.byStatus.filter((row) => row.status === "OPEN" || row.status === "IN_PROGRESS").reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ReportStat label="Pass rate" value={report.passRate === null ? "–" : `${report.passRate}%`} hint="Of passed, failed and blocked" />
        <ReportStat label="Results recorded" value={report.results.toLocaleString("en-US")} hint="In this period" />
        <ReportStat label="Coverage" value={insights.coverage === null ? "–" : `${insights.coverage}%`} hint={`${insights.executedCases} of ${insights.totalCases} cases run`} />
        <ReportStat label="Average time" value={insights.averageSeconds === null ? "–" : formatDuration(insights.averageSeconds)} hint="Per result" />
        <ReportStat label="Total test time" value={formatDuration(insights.totalSeconds)} hint="In this period" />
        <ReportStat label="Active bugs" value={String(activeBugs)} hint={`${insights.bugs.opened} opened, ${insights.bugs.resolved} resolved in period`} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-3"
          title="Pass rate trend"
          table={{ headers: ["Day", "Pass rate", "Decided results"], rows: trend.map((row) => [row.label, row.passRate === null ? "–" : `${row.passRate}%`, row.results]) }}
        >
          {trend.length === 0 ? <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No results in this period.</p> : <TrendLine data={trend} />}
        </ChartCard>
        <ChartCard
          className="lg:col-span-2"
          title="Results by status"
          legend={results.map((entry) => ({ label: entry.name, color: entry.color, value: entry.value }))}
          table={{ headers: ["Status", "Results"], rows: results.map((entry) => [entry.name, entry.value]) }}
        >
          {results.length === 0 ? <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">No results in this period.</p> : <Donut data={results} centerLabel="results" centerValue={report.results.toLocaleString("en-US")} />}
        </ChartCard>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <ChartCard title="Cases by priority" table={{ headers: ["Priority", "Cases"], rows: priorities.map((row) => [row.label, row.value]) }}>
          <Bars data={priorities} name="Cases" />
        </ChartCard>
        <ChartCard title="Cases by type" table={{ headers: ["Type", "Cases"], rows: types.map((row) => [row.label, row.value]) }}>
          <Bars data={types} name="Cases" />
        </ChartCard>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <ReportList title="Most failing cases" empty="Nothing failed in this period.">
          {report.mostFailing.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{caseLabel(row.caseNumber)}</span>
              <Link href={`/cases/${row.id}?tab=results`} className="min-w-0 flex-1 truncate font-medium hover:text-primary">{row.title}</Link>
              <span className="shrink-0 font-mono text-xs tabular-nums">{row.failures} {row.failures === 1 ? "failure" : "failures"}</span>
            </li>
          ))}
        </ReportList>
        <ReportList title="Not run in this period" empty="Every case was run in this period." note={insights.totalCases - insights.executedCases > insights.neverExecuted.length ? `Highest priority first. ${insights.totalCases - insights.executedCases} in total.` : undefined}>
          {insights.neverExecuted.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{caseLabel(row.caseNumber)}</span>
              <Link href={`/cases/${row.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-primary">{row.title}</Link>
              <PriorityBadge priority={row.priority} />
            </li>
          ))}
        </ReportList>
      </div>

      <GlassCard className="mt-5 p-5 print:break-inside-avoid">
        <h2 className="font-semibold tracking-tight">Runs</h2>
        {insights.runs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No runs in this period.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-120 text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  {["Run", "Status", "Executed", "Passed", "Progress"].map((heading) => (
                    <th key={heading} scope="col" className="py-1.5 pr-4 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {insights.runs.map((run) => {
                  const summary = summarizeCounts(run.counts);
                  return (
                    <tr key={run.id}>
                      <td className="max-w-64 truncate py-2 pr-4 font-medium">
                        <Link href={`/runs/${run.id}`} className="hover:text-primary">{run.name}</Link>
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{run.status === "COMPLETED" ? "Closed" : "Active"}</td>
                      <td className="py-2 pr-4 font-mono text-xs tabular-nums">{summary.percentDone}%</td>
                      <td className="py-2 pr-4 font-mono text-xs tabular-nums">{summary.percentPassed}%</td>
                      <td className="w-1/3 py-2"><RunProgress counts={run.counts} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
        <GlassCard className="p-5 print:break-inside-avoid">
          <h2 className="font-semibold tracking-tight">By tester</h2>
          {insights.testers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No results in this period.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {insights.testers.map((tester) => (
                <li key={tester.name} className="py-2 text-sm">
                  <p className="flex justify-between gap-3">
                    <span className="truncate font-medium">{tester.name}</span>
                    <span className="shrink-0 font-mono text-xs tabular-nums">{tester.passRate}% passed</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {tester.total} results · {tester.failed} failed · {formatDuration(tester.seconds)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
        <GlassCard className="p-5 print:break-inside-avoid">
          <h2 className="font-semibold tracking-tight">Top defect references</h2>
          {insights.defects.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No defects were recorded in this period.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {insights.defects.map((row) => (
                <li key={row.defect} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="truncate font-mono text-xs">{row.defect}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
        <GlassCard className="p-5 print:break-inside-avoid">
          <h2 className="font-semibold tracking-tight">Bugs</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {insights.bugs.byStatus.map((row) => (
              <li key={row.status} className="flex items-center gap-1.5">
                <BugStatusBadge status={row.status} />
                <span className="font-mono text-sm tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-4 text-xs font-medium text-muted-foreground">Active, by severity</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {insights.bugs.openBySeverity.map((row) => (
              <li key={row.severity} className="flex items-center gap-1.5">
                <PriorityBadge priority={row.severity} />
                <span className="font-mono text-sm tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
          <Link href="/bugs" className="mt-4 inline-block text-sm font-medium text-primary hover:underline print:hidden">View all bugs</Link>
        </GlassCard>
      </div>
    </>
  );
}

function ReportStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <GlassCard className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </GlassCard>
  );
}

function ReportList({ title, empty, note, children }: { title: string; empty: string; note?: string; children: React.ReactNode[] }) {
  return (
    <GlassCard className="p-5 print:break-inside-avoid">
      <h2 className="font-semibold tracking-tight">{title}</h2>
      {children.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{empty}</p> : <ol className="mt-3 divide-y divide-border">{children}</ol>}
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </GlassCard>
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
                  <Link href={`/bugs/new?runCase=${failure.id}`} className="text-xs font-medium text-primary hover:underline print:hidden">Report a bug</Link>
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
