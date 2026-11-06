import { NextResponse } from "next/server";
import { getProjectForRoute } from "@/lib/auth/project-access";
import { getRun, getRunCaseDetail } from "@/server/queries/runs";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string; runCaseId: string }> }) {
  const { runId, runCaseId } = await params;
  const run = await getRun(runId);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await getProjectForRoute(run.projectId);
  if (access.status !== 200) return NextResponse.json({ error: "Not allowed" }, { status: access.status });

  const detail = await getRunCaseDetail(runId, runCaseId);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } });
}
