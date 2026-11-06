import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./index";

type ActivityEntry = {
  projectId: string;
  userId: string;
  action: string;
  entityType: "project" | "section" | "case" | "run" | "milestone" | "member";
  entityId: string;
  meta?: Prisma.InputJsonValue;
};

export function logActivity(client: Pick<Prisma.TransactionClient, "activityLog"> | typeof db, entry: ActivityEntry) {
  return client.activityLog.create({ data: entry, select: { id: true } });
}
