import { NextResponse, type NextRequest } from "next/server";
import { getProjectForRoute } from "@/lib/auth/project-access";
import { BUG_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants/testing";
import { csvRow } from "@/lib/utils/csv";
import { parseBugQuery } from "@/lib/validations/bug-query";
import { listBugsForExport } from "@/server/queries/bugs";

const HEADER = ["ID", "Title", "Severity", "Status", "Assignee", "Reported by", "Test case", "Environment", "External reference", "Description", "Steps to reproduce", "Expected", "Actual", "Created", "Resolved"];

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await getProjectForRoute(projectId);
  if (access.status !== 200) return NextResponse.json({ error: "Not allowed" }, { status: access.status });

  const { searchParams } = request.nextUrl;
  const bugs = await listBugsForExport(projectId, parseBugQuery((key) => searchParams.get(key)));
  const lines = [
    csvRow(HEADER),
    ...bugs.map((bug) =>
      csvRow([
        `B${bug.bugNumber}`,
        bug.title,
        PRIORITY_LABELS[bug.severity],
        BUG_STATUS_LABELS[bug.status],
        bug.assignedTo?.name,
        bug.reportedBy.name,
        bug.testCase ? `C${bug.testCase.caseNumber}` : "",
        bug.environment,
        bug.externalRef,
        bug.description,
        bug.stepsToReproduce,
        bug.expectedResult,
        bug.actualResult,
        bug.createdAt.toISOString().slice(0, 10),
        bug.resolvedAt?.toISOString().slice(0, 10),
      ]),
    ),
  ];

  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${access.project.key.toLowerCase()}-bugs.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
