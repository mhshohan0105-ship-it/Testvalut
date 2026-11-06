"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Bug, Download, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { BugStatusBadge, PriorityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/form-controls";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { BUG_STATUSES, BUG_STATUS_LABELS, PRIORITIES, PRIORITY_LABELS } from "@/lib/constants/testing";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";
import { serializeBugQuery, type BugQuery } from "@/lib/validations/bug-query";
import type { BugRow } from "@/server/queries/bugs";
import type { Priority } from "@/generated/prisma/enums";

const ROW_HEIGHT = 48;
const SEARCH_DEBOUNCE_MS = 250;
const GRID = "grid grid-cols-[1fr_5.5rem] md:grid-cols-[4rem_1fr_6.5rem_6.5rem_9rem] xl:grid-cols-[4rem_1fr_6.5rem_6.5rem_9rem_7rem] items-center";

type ListResponse = { rows: BugRow[]; nextCursor: string | null; total: number | null };

export function BugList({
  project,
  people,
  initialList,
  initialQuery,
  canReport,
}: {
  project: { id: string; name: string };
  people: { id: string; name: string }[];
  initialList: ListResponse;
  initialQuery: BugQuery;
  canReport: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [searchText, setSearchText] = useState(initialQuery.q);
  const [rows, setRows] = useState(initialList.rows);
  const [total, setTotal] = useState(initialList.total ?? 0);
  const [nextCursor, setNextCursor] = useState(initialList.nextCursor);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // eslint-disable-next-line react-hooks/incompatible-library -- the virtualizer's functions aren't passed to memoized children
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => ROW_HEIGHT, overscan: 10 });
  const peopleById = new Map(people.map((person) => [person.id, person.name]));

  function url(activeQuery: BugQuery, cursor?: string) {
    const params = serializeBugQuery(activeQuery);
    if (cursor) params.set("cursor", cursor);
    return `/api/projects/${project.id}/bugs?${params}`;
  }

  async function apply(next: BugQuery) {
    setQuery(next);
    const params = serializeBugQuery(next).toString();
    window.history.replaceState(null, "", params ? `/bugs?${params}` : "/bugs");
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const response = await fetch(url(next), { signal: controller.signal });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as ListResponse;
      setRows(data.rows);
      setTotal(data.total ?? 0);
      setNextCursor(data.nextCursor);
      scrollRef.current?.scrollTo({ top: 0 });
      setLoading(false);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error(error);
      toast.error("Couldn't load bugs. Please try again.");
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const response = await fetch(url(query, nextCursor));
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as ListResponse;
      setRows((current) => [...current, ...data.rows]);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't load more bugs.");
    } finally {
      loadingMoreRef.current = false;
    }
  }

  const exportParams = serializeBugQuery(query).toString();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Bugs</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">{project.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <a href={`/api/projects/${project.id}/bugs/export${exportParams ? `?${exportParams}` : ""}`} download>
              <Download /> Export
            </a>
          </Button>
          {canReport && (
            <Button asChild>
              <Link href="/bugs/new">
                <Plus /> Report a bug
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-44 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={searchText}
            aria-label="Search bugs"
            placeholder="Search by title or B-number"
            className="rounded-xl pl-9"
            onChange={(event) => {
              const value = event.target.value;
              setSearchText(value);
              clearTimeout(timerRef.current);
              timerRef.current = setTimeout(() => void apply({ ...query, q: value.trim() }), SEARCH_DEBOUNCE_MS);
            }}
          />
        </div>
        <NativeSelect aria-label="Filter by status" className="h-9 w-40" value={query.status} onChange={(event) => void apply({ ...query, status: event.target.value })}>
          <option value="ACTIVE">Open and in progress</option>
          <option value="ALL">All statuses</option>
          {BUG_STATUSES.map((status) => (
            <option key={status} value={status}>
              {BUG_STATUS_LABELS[status]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filter by severity" className="h-9 w-36" value={query.severity} onChange={(event) => void apply({ ...query, severity: event.target.value as Priority | "" })}>
          <option value="">All severities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filter by assignee" className="h-9 w-40" value={query.assignee} onChange={(event) => void apply({ ...query, assignee: event.target.value })}>
          <option value="">All assignees</option>
          <option value="none">Unassigned</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="flex h-[calc(100dvh-16rem)] min-h-96 flex-col">
          <div role="table" aria-label="Bugs" aria-rowcount={total + 1} className="flex min-h-0 flex-1 flex-col">
            <div role="row" className={cn(GRID, "h-10 shrink-0 border-b border-border px-4 text-xs font-medium text-muted-foreground")}>
              <div role="columnheader" className="hidden md:block">ID</div>
              <div role="columnheader">Title</div>
              <div role="columnheader" className="hidden md:block">Severity</div>
              <div role="columnheader">Status</div>
              <div role="columnheader" className="hidden md:block">Assignee</div>
              <div role="columnheader" className="hidden xl:block">Reported</div>
            </div>
            <div
              ref={scrollRef}
              role="presentation"
              className={cn("min-h-0 flex-1 overflow-y-auto transition-opacity duration-150", loading && "opacity-60")}
              onScroll={(event) => {
                const element = event.currentTarget;
                if (element.scrollHeight - element.scrollTop - element.clientHeight < ROW_HEIGHT * 20) void loadMore();
              }}
            >
              {rows.length === 0 && !loading ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <Bug className="size-8 text-primary" aria-hidden />
                  <p className="font-semibold">No bugs here</p>
                  <p className="max-w-sm text-sm text-muted-foreground">Try other filters, or report one when a test turns something up.</p>
                </div>
              ) : (
                <div role="rowgroup" className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    if (!row) return null;
                    return (
                      <div
                        key={row.id}
                        role="row"
                        aria-rowindex={virtualRow.index + 2}
                        className={cn(GRID, "absolute top-0 left-0 w-full border-b border-border/60 px-4 text-sm transition-colors hover:bg-accent/50")}
                        style={{ height: ROW_HEIGHT, transform: `translateY(${virtualRow.start}px)` }}
                      >
                        <div role="cell" className="hidden font-mono text-xs text-muted-foreground tabular-nums md:block">B{row.bugNumber}</div>
                        <div role="cell" className="min-w-0 pr-3">
                          <Link href={`/bugs/${row.id}`} className="block truncate font-medium hover:text-primary">
                            {row.title}
                          </Link>
                          <span className="block font-mono text-[11px] text-muted-foreground md:hidden">B{row.bugNumber}</span>
                        </div>
                        <div role="cell" className="hidden md:block"><PriorityBadge priority={row.severity} /></div>
                        <div role="cell"><BugStatusBadge status={row.status} /></div>
                        <div role="cell" className="hidden truncate text-xs text-muted-foreground md:block">
                          {row.assignedToId ? (peopleById.get(row.assignedToId) ?? "Former member") : "Unassigned"}
                        </div>
                        <div role="cell" className="hidden text-xs text-muted-foreground xl:block">{formatDate(row.createdAt)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex h-9 shrink-0 items-center justify-between border-t border-border px-4 text-xs text-muted-foreground">
            <span className="tabular-nums" aria-live="polite">{total.toLocaleString("en-US")} {total === 1 ? "bug" : "bugs"}</span>
            {nextCursor && <span className="tabular-nums">{rows.length.toLocaleString("en-US")} loaded</span>}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
