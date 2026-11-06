import { NextResponse, type NextRequest } from "next/server";
import { getProjectForRoute } from "@/lib/auth/project-access";
import { parseBugQuery } from "@/lib/validations/bug-query";
import { listBugs } from "@/server/queries/bugs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await getProjectForRoute(projectId);
  if (access.status !== 200) return NextResponse.json({ error: "Not allowed" }, { status: access.status });

  const { searchParams } = request.nextUrl;
  const result = await listBugs(projectId, parseBugQuery((key) => searchParams.get(key)), searchParams.get("cursor") ?? undefined);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
