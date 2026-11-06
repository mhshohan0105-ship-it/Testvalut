import { NextResponse, type NextRequest } from "next/server";
import { getProjectForRoute } from "@/lib/auth/project-access";
import { STATUS_ORDER } from "@/lib/constants/status";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants/testing";
import { csvRow } from "@/lib/utils/csv";
import { parseDateRange } from "@/lib/utils/date-range";
import { getRunReport } from "@/server/queries/reports";
import { getRun, getRunStatusCounts } from "@/server/queries/runs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await getRun(runId);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await getProjectForRoute(run.projectId);
  if (access.status !== 200) return NextResponse.json({ error: "Not allowed" }, { status: access.status });

  const { searchParams } = request.nextUrl;
  const range = parseDateRange(searchParams.get("from"), searchParams.get("to"));
  const [report, counts] = await Promise.all([getRunReport(runId, range), getRunStatusCounts(runId)]);

  const lines = [
    csvRow(["Run report", run.name]),
    csvRow(["Environment", run.environment]),
    csvRow(["From", range.fromDay, "To", range.toDay]),
    "",
    csvRow(["Status", "Cases"]),
    ...STATUS_ORDER.map((status) => csvRow([STATUS_LABELS[status], counts[status] ?? 0])),
    "",
    csvRow(["Tester", "Results", "Passed", "Failed", "Blocked", "Seconds"]),
    ...report.testers.map((tester) => csvRow([tester.name, tester.total, tester.passed, tester.failed, tester.blocked, tester.seconds])),
    "",
    csvRow(["Case", "Title", "Priority", "Status", "Comment", "Actual result", "Defect", "Reported by"]),
    ...report.failures.map((failure) =>
      csvRow([
        `C${failure.testCase.caseNumber}`,
        failure.testCase.title,
        PRIORITY_LABELS[failure.testCase.priority],
        STATUS_LABELS[failure.currentStatus],
        failure.latest?.comment,
        failure.latest?.actualResult,
        failure.latest?.defectRef,
        failure.latest?.createdBy.name,
      ]),
    ),
  ];

  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="run-report-${run.id}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
