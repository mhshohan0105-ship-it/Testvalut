import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_MODE } from "@/lib/demo";
import { seedData, wipeData } from "@/prisma/seed-core";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Restores the demo's sample data. It deletes everything in the database, so it needs both demo mode
 * and the secret that Vercel Cron sends. Outside demo mode it doesn't exist as far as a caller can tell.
 */
export async function GET(request: Request) {
  if (!DEMO_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  await wipeData(db);
  const summary = await seedData(db, { password: process.env.SEED_PASSWORD ?? randomBytes(12).toString("base64url"), demo: true });
  return NextResponse.json({ ok: true, ...summary });
}
