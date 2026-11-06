import { NextResponse, type NextRequest } from "next/server";
import type { TestStatus } from "@/generated/prisma/enums";
import { getProjectForRoute } from "@/lib/auth/project-access";
import { STATUS_ORDER } from "@/lib/constants/status";
import { getRun, getRunStatusCounts, listRunCases } from "@/server/queries/runs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await getRun(runId);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await getProjectForRoute(run.projectId);
  if (access.status !== 200) return NextResponse.json({ error: "Not allowed" }, { status: access.status });

  const { searchParams } = request.nextUrl;
  const statusParam = searchParams.get("status") as TestStatus | null;
  const status = statusParam && STATUS_ORDER.includes(statusParam) ? statusParam : null;
  const cursor = searchParams.get("cursor") ?? undefined;

  const [list, counts] = await Promise.all([
    listRunCases(runId, { status, assignee: searchParams.get("assignee") }, cursor),
    cursor ? Promise.resolve(null) : getRunStatusCounts(runId),
  ]);
  return NextResponse.json({ ...list, counts, runStatus: run.status }, { headers: { "Cache-Control": "no-store" } });
}
