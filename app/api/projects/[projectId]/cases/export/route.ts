import { NextResponse, type NextRequest } from "next/server";
import { getProjectForRoute } from "@/lib/auth/project-access";
import { CASE_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/constants/testing";
import { csvRow, formatStepsCell } from "@/lib/utils/csv";
import { richTextToPlain } from "@/lib/utils/sanitize";
import { sectionPath } from "@/lib/utils/tree";
import { parseCaseQuery } from "@/lib/validations/case-query";
import { getSections, listCasesForExport } from "@/server/queries/cases";

const HEADER = ["ID", "Title", "Section", "Priority", "Type", "Estimate", "References", "Tags", "Preconditions", "Steps"];

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await getProjectForRoute(projectId);
  if (access.status !== 200) return NextResponse.json({ error: "Not allowed" }, { status: access.status });

  const { searchParams } = request.nextUrl;
  const [cases, sections] = await Promise.all([
    listCasesForExport(projectId, parseCaseQuery((key) => searchParams.get(key))),
    getSections(projectId),
  ]);

  const lines = [
    csvRow(HEADER),
    ...cases.map((testCase) =>
      csvRow([
        `C${testCase.caseNumber}`,
        testCase.title,
        sectionPath(sections, testCase.sectionId),
        PRIORITY_LABELS[testCase.priority],
        CASE_TYPE_LABELS[testCase.type],
        testCase.estimate,
        testCase.references,
        testCase.tags.join("; "),
        testCase.preconditions ? richTextToPlain(testCase.preconditions) : "",
        formatStepsCell(testCase.steps),
      ]),
    ),
  ];

  // The byte order mark tells Excel the file is UTF-8.
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${access.project.key.toLowerCase()}-test-cases.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
