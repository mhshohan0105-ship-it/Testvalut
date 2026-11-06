import { NextResponse, type NextRequest } from "next/server";
import { getProjectForRoute } from "@/lib/auth/project-access";
import { STATUS_ORDER, summarizeCounts } from "@/lib/constants/status";
import { BUG_STATUS_LABELS, CASE_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants/testing";
import { csvRow } from "@/lib/utils/csv";
import { parseDateRange } from "@/lib/utils/date-range";
import { getProjectInsights } from "@/server/queries/report-insights";
import { getProjectReport } from "@/server/queries/reports";

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await getProjectForRoute(projectId);
  if (access.status !== 200) return NextResponse.json({ error: "Not allowed" }, { status: access.status });

  const { searchParams } = request.nextUrl;
  const range = parseDateRange(searchParams.get("from"), searchParams.get("to"));
  const [report, insights] = await Promise.all([getProjectReport(projectId, range), getProjectInsights(projectId, range)]);

  const lines = [
    csvRow(["Project report", access.project.name]),
    csvRow(["From", range.fromDay, "To", range.toDay]),
    csvRow(["Results", report.results, "Pass rate", report.passRate === null ? "" : `${report.passRate}%`]),
    csvRow(["Coverage", insights.coverage === null ? "" : `${insights.coverage}%`, "Cases run", insights.executedCases, "Total cases", insights.totalCases]),
    csvRow(["Average seconds per result", insights.averageSeconds, "Total seconds", insights.totalSeconds]),
    "",
    csvRow(["Result status", "Results"]),
    ...STATUS_ORDER.map((status) => csvRow([STATUS_LABELS[status], insights.statusCounts[status] ?? 0])),
    "",
    csvRow(["Day", "Pass rate", "Decided results"]),
    ...report.trend.map((row) => csvRow([row.day, row.passRate === null ? "" : `${row.passRate}%`, row.results])),
    "",
    csvRow(["Priority", "Cases"]),
    ...report.priorities.map((row) => csvRow([PRIORITY_LABELS[row.priority], row.count])),
    "",
    csvRow(["Most failing case", "Title", "Failures"]),
    ...report.mostFailing.map((row) => csvRow([`C${row.caseNumber}`, row.title, row.failures])),
    "",
    csvRow(["Type", "Cases"]),
    ...insights.types.map((row) => csvRow([CASE_TYPE_LABELS[row.type], row.count])),
    "",
    csvRow(["Not run in period", "Title", "Priority"]),
    ...insights.neverExecuted.map((row) => csvRow([`C${row.caseNumber}`, row.title, PRIORITY_LABELS[row.priority]])),
    "",
    csvRow(["Tester", "Results", "Passed", "Failed", "Pass rate", "Seconds"]),
    ...insights.testers.map((row) => csvRow([row.name, row.total, row.passed, row.failed, `${row.passRate}%`, row.seconds])),
    "",
    csvRow(["Run", "Status", "Executed", "Passed"]),
    ...insights.runs.map((run) => {
      const summary = summarizeCounts(run.counts);
      return csvRow([run.name, run.status === "COMPLETED" ? "Closed" : "Active", `${summary.percentDone}%`, `${summary.percentPassed}%`]);
    }),
    "",
    csvRow(["Defect reference", "Results"]),
    ...insights.defects.map((row) => csvRow([row.defect, row.count])),
    "",
    csvRow(["Bug status", "Bugs"]),
    ...insights.bugs.byStatus.map((row) => csvRow([BUG_STATUS_LABELS[row.status], row.count])),
    csvRow(["Opened in period", insights.bugs.opened, "Resolved in period", insights.bugs.resolved]),
  ];

  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${access.project.key.toLowerCase()}-project-report.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
