import type { CaseType, Priority } from "@/generated/prisma/enums";
import { CASE_TYPES, PRIORITIES } from "@/lib/constants/testing";

export const SORT_FIELDS = ["caseNumber", "title", "priority", "type", "updatedAt"] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export type CaseQuery = {
  q: string;
  section: string | null;
  priorities: Priority[];
  types: CaseType[];
  tags: string[];
  sort: SortField;
  dir: "asc" | "desc";
};

export const DEFAULT_CASE_QUERY: CaseQuery = { q: "", section: null, priorities: [], types: [], tags: [], sort: "caseNumber", dir: "asc" };

function parseList<T extends string>(value: string | null | undefined, allowed?: readonly T[]) {
  const parts = (value ?? "").split(",").filter(Boolean) as T[];
  return allowed ? parts.filter((part) => allowed.includes(part)) : parts;
}

/** Anything unrecognized falls back to the default, so a hand-edited URL can't cause an error. */
export function parseCaseQuery(get: (key: string) => string | null | undefined): CaseQuery {
  const sort = get("sort") as SortField;
  return {
    q: (get("q") ?? "").trim().slice(0, 200),
    section: get("section") || null,
    priorities: parseList(get("priority"), PRIORITIES),
    types: parseList(get("type"), CASE_TYPES),
    tags: parseList<string>(get("tag")),
    sort: SORT_FIELDS.includes(sort) ? sort : DEFAULT_CASE_QUERY.sort,
    dir: get("dir") === "desc" ? "desc" : "asc",
  };
}

export function serializeCaseQuery(query: CaseQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.section) params.set("section", query.section);
  if (query.priorities.length) params.set("priority", query.priorities.join(","));
  if (query.types.length) params.set("type", query.types.join(","));
  if (query.tags.length) params.set("tag", query.tags.join(","));
  if (query.sort !== DEFAULT_CASE_QUERY.sort) params.set("sort", query.sort);
  if (query.dir !== DEFAULT_CASE_QUERY.dir) params.set("dir", query.dir);
  return params;
}
