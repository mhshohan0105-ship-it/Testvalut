import type { Priority } from "@/generated/prisma/enums";
import { BUG_STATUSES, PRIORITIES } from "@/lib/constants/testing";

/** "ACTIVE" means open or in progress, which is what people usually want to see. */
export type BugQuery = { q: string; status: string; severity: Priority | ""; assignee: string };

export const DEFAULT_BUG_QUERY: BugQuery = { q: "", status: "ACTIVE", severity: "", assignee: "" };

export function parseBugQuery(get: (key: string) => string | null | undefined): BugQuery {
  const status = get("status") ?? "";
  const severity = get("severity") as Priority;
  return {
    q: (get("q") ?? "").trim().slice(0, 200),
    status: status === "ALL" || (BUG_STATUSES as string[]).includes(status) ? status : "ACTIVE",
    severity: PRIORITIES.includes(severity) ? severity : "",
    assignee: get("assignee") ?? "",
  };
}

export function serializeBugQuery(query: BugQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status !== "ACTIVE") params.set("status", query.status);
  if (query.severity) params.set("severity", query.severity);
  if (query.assignee) params.set("assignee", query.assignee);
  return params;
}
