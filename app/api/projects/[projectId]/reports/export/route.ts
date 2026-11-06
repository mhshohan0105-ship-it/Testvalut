import { NextResponse, type NextRequest } from "next/server";
import { getProjectForRoute } from "@/lib/auth/project-access";
import { PRIORITY_LABELS } from "@/lib/constants/testing";
import { csvRow } from "@/lib/utils/csv";
import { parseDateRange } from "@/lib/utils/date-range";
import { getProjectReport } from "@/server/queries/reports";

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await getProjectForRoute(projectId);
  if (access.status !== 200) return NextResponse.json({ error: "Not allowed" }, { status: access.status });

  const { searchParams } = request.nextUrl;
  const range = parseDateRange(searchParams.get("from"), searchParams.get("to"));
  const report = await getProjectReport(projectId, range);

  const lines = [
    csvRow(["Project report", access.project.name]),
    csvRow(["From", range.fromDay, "To", range.toDay]),
    csvRow(["Results", report.results, "Pass rate", report.passRate === null ? "" : `${report.passRate}%`]),
    "",
    csvRow(["Day", "Pass rate", "Decided results"]),
    ...report.trend.map((row) => csvRow([row.day, row.passRate === null ? "" : `${row.passRate}%`, row.results])),
    "",
    csvRow(["Priority", "Cases"]),
    ...report.priorities.map((row) => csvRow([PRIORITY_LABELS[row.priority], row.count])),
    "",
    csvRow(["Most failing case", "Title", "Failures"]),
    ...report.mostFailing.map((row) => csvRow([`C${row.caseNumber}`, row.title, row.failures])),
  ];

  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${access.project.key.toLowerCase()}-project-report.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
