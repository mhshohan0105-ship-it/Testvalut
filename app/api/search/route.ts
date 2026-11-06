import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { searchEverything } from "@/server/queries/search";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 200);
  if (!query) return NextResponse.json({ projects: [], cases: [], runs: [] });
  return NextResponse.json(await searchEverything(user, query), { headers: { "Cache-Control": "no-store" } });
}
