import { NextResponse } from "next/server";
import { getProjectForRoute } from "@/lib/auth/project-access";
import { getSectionsWithCounts } from "@/server/queries/cases";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await getProjectForRoute(projectId);
  if (access.status !== 200) return NextResponse.json({ error: "Not allowed" }, { status: access.status });
  return NextResponse.json(await getSectionsWithCounts(projectId));
}
