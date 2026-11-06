import { NextResponse, type NextRequest } from "next/server";
import { getProjectForRoute } from "@/lib/auth/project-access";
import { parseCaseQuery } from "@/lib/validations/case-query";
import { listCases } from "@/server/queries/cases";

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await getProjectForRoute(projectId);
  if (access.status !== 200) return NextResponse.json({ error: "Not allowed" }, { status: access.status });

  const { searchParams } = request.nextUrl;
  const result = await listCases(projectId, parseCaseQuery((key) => searchParams.get(key)), searchParams.get("cursor") ?? undefined);
  return NextResponse.json(result);
}
