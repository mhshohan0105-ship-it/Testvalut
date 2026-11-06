"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Lock, Play, RotateCcw, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/form-controls";
import { GlassCard } from "@/components/ui/glass-card";
import type { RunStatus, TestStatus } from "@/generated/prisma/enums";
import { STATUS_BAR_CLASS, STATUS_ORDER, summarizeCounts, type StatusCounts } from "@/lib/constants/status";
import { STATUS_LABELS } from "@/lib/constants/testing";
import { cn } from "@/lib/utils";
import { caseLabel } from "@/lib/utils/format";
import { closeRun, reassignRunCases, rerunFailed } from "@/server/actions/runs";
import type { RunCaseRow } from "@/server/queries/runs";
import { RunProgress } from "./run-progress";

const ROW_HEIGHT = 48;
const UNASSIGNED = "none";
const GRID = "grid grid-cols-[2.25rem_1fr_5.5rem] md:grid-cols-[2.25rem_4.5rem_1fr_6.5rem_5.5rem_9rem] items-center";

type ListResponse = { rows: RunCaseRow[]; nextCursor: string | null; total: number | null; counts: StatusCounts | null; runStatus: RunStatus };

export function RunOverview({
  runId,
  runStatus,
  people,
  initialList,
  initialCounts,
  canManage,
  canExecute,
}: {
  runId: string;
  runStatus: RunStatus;
  people: { id: string; name: string }[];
  initialList: Omit<ListResponse, "counts" | "runStatus">;
  initialCounts: StatusCounts;
  canManage: boolean;
  canExecute: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialList.rows);
  const [total, setTotal] = useState(initialList.total ?? 0);
  const [nextCursor, setNextCursor] = useState(initialList.nextCursor);
  const [counts, setCounts] = useState(initialCounts);
  const [statusFilter, setStatusFilter] = useState<TestStatus | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [dialog, setDialog] = useState<"reassign" | "close" | null>(null);
  const [assigneeChoice, setAssigneeChoice] = useState(UNASSIGNED);
  const [rerunning, startRerun] = useTransition();

  const scrollRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);

  const active = runStatus === "ACTIVE";
  const { total: totalCases, done, percentDone } = summarizeCounts(counts);
  const peopleById = new Map(people.map((person) => [person.id, person.name]));

  // eslint-disable-next-line react-hooks/incompatible-library -- the virtualizer's functions aren't passed to memoized children
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => ROW_HEIGHT, overscan: 10 });

  function listUrl(status: TestStatus | null, assignee: string, cursor?: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (assignee) params.set("assignee", assignee);
    if (cursor) params.set("cursor", cursor);
    return `/api/runs/${runId}/cases?${params}`;
  }

  async function reload(status: TestStatus | null, assignee: string) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch(listUrl(status, assignee), { signal: controller.signal });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as ListResponse;
      setRows(data.rows);
      setTotal(data.total ?? 0);
      setNextCursor(data.nextCursor);
      if (data.counts) setCounts(data.counts);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error(error);
      toast.error("Couldn't load this run's cases.");
    }
  }

  // Returning from execution with the Back button restores this page from the router cache, so it refetches on open.
  useEffect(() => {
    void reload(null, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, []);

  function applyFilters(status: TestStatus | null, assignee: string) {
    setStatusFilter(status);
    setAssigneeFilter(assignee);
    setSelected(new Set());
    scrollRef.current?.scrollTo({ top: 0 });
    void reload(status, assignee);
  }

  async function loadMore() {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const response = await fetch(listUrl(statusFilter, assigneeFilter, nextCursor));
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as ListResponse;
      setRows((current) => [...current, ...data.rows]);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't load more cases.");
    } finally {
      loadingMoreRef.current = false;
    }
  }

  async function reassign() {
    const assignedToId = assigneeChoice === UNASSIGNED ? null : assigneeChoice;
    const ids = [...selected];
    const previous = rows;
    setRows(rows.map((row) => (selected.has(row.id) ? { ...row, assignedToId } : row)));
    setSelected(new Set());
    setDialog(null);
    const result = await reassignRunCases({ runId, runCaseIds: ids, assignedToId });
    if (result.ok) {
      toast.success(`Reassigned ${result.data.count} case(s)`);
      if (assigneeFilter) void reload(statusFilter, assigneeFilter);
    } else {
      setRows(previous);
      toast.error(result.error);
    }
  }

  async function close() {
    const result = await closeRun(runId);
    if (result.ok) toast.success("Run closed. It's now read only.");
    else toast.error(result.error);
  }

  function rerun() {
    startRerun(async () => {
      const result = await rerunFailed(runId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`New run created with ${result.data.count} case(s)`);
      router.push(`/runs/${result.data.id}`);
    });
  }

  const failures = (counts.FAILED ?? 0) + (counts.BLOCKED ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground tabular-nums">
            <span className="font-mono text-3xl font-semibold text-foreground">{percentDone}%</span> <span className="ml-1">{done} of {totalCases} executed</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && active && (
              <Button variant="outline" onClick={() => setDialog("close")}>
                <Lock /> Close run
              </Button>
            )}
            {canManage && failures > 0 && (
              <Button variant="outline" onClick={rerun} disabled={rerunning}>
                <RotateCcw /> {rerunning ? "Creating…" : `Rerun ${failures} failed`}
              </Button>
            )}
            <Button asChild>
              <Link href={`/runs/${runId}/execute`}>
                <Play /> {active && canExecute ? "Execute" : "Review"}
              </Link>
            </Button>
          </div>
        </div>
        <RunProgress counts={counts} className="mt-4 h-4" />
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {STATUS_ORDER.map((status) => {
            const pressed = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={pressed}
                onClick={() => applyFilters(pressed ? null : status, assigneeFilter)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
                  pressed ? "border-primary bg-primary/15" : "border-border hover:bg-accent/60",
                )}
              >
                <span className={cn("size-2.5 rounded-full", STATUS_BAR_CLASS[status])} aria-hidden />
                {STATUS_LABELS[status]}
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{counts[status] ?? 0}</span>
              </button>
            );
          })}
          <NativeSelect
            aria-label="Filter by assignee"
            className="ml-auto h-9 w-44"
            value={assigneeFilter}
            onChange={(event) => applyFilters(statusFilter, event.target.value)}
          >
            <option value="">All assignees</option>
            <option value={UNASSIGNED}>Unassigned</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </GlassCard>

      <GlassCard className="relative overflow-hidden">
        <div className="flex h-[calc(100dvh-24rem)] min-h-96 flex-col">
          <div role="table" aria-label="Cases in this run" aria-rowcount={total + 1} className="flex min-h-0 flex-1 flex-col">
          <div role="row" className={cn(GRID, "h-10 shrink-0 border-b border-border px-2 text-xs font-medium text-muted-foreground")}>
            <div role="columnheader" className="flex justify-center">
              <input
                type="checkbox"
                aria-label="Select all loaded cases"
                className="size-4 accent-primary"
                disabled={!canManage || !active}
                checked={rows.length > 0 && selected.size === rows.length}
                onChange={() => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((row) => row.id)))}
              />
            </div>
            <div role="columnheader" className="hidden md:block">ID</div>
            <div role="columnheader">Title</div>
            <div role="columnheader" className="hidden md:block">Priority</div>
            <div role="columnheader">Status</div>
            <div role="columnheader" className="hidden md:block">Assignee</div>
          </div>
          <div
            ref={scrollRef}
            role="presentation"
            className="min-h-0 flex-1 overflow-y-auto"
            onScroll={(event) => {
              const element = event.currentTarget;
              if (element.scrollHeight - element.scrollTop - element.clientHeight < ROW_HEIGHT * 20) void loadMore();
            }}
          >
            {rows.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">No cases match these filters.</p>
            ) : (
              <div role="rowgroup" className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  if (!row) return null;
                  const isSelected = selected.has(row.id);
                  return (
                    <div
                      key={row.id}
                      role="row"
                      aria-rowindex={virtualRow.index + 2}
                      aria-selected={isSelected}
                      className={cn(GRID, "absolute top-0 left-0 w-full border-b border-border/60 px-2 text-sm transition-colors hover:bg-accent/50", isSelected && "bg-primary/10")}
                      style={{ height: ROW_HEIGHT, transform: `translateY(${virtualRow.start}px)` }}
                    >
                      <div role="cell" className="flex justify-center">
                        <input
                          type="checkbox"
                          aria-label={`Select ${caseLabel(row.caseNumber)}`}
                          className="size-4 accent-primary"
                          disabled={!canManage || !active}
                          checked={isSelected}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (!next.delete(row.id)) next.add(row.id);
                              return next;
                            })
                          }
                        />
                      </div>
                      <div role="cell" className="hidden font-mono text-xs text-muted-foreground tabular-nums md:block">{caseLabel(row.caseNumber)}</div>
                      <div role="cell" className="min-w-0 pr-3">
                        <Link href={`/runs/${runId}/execute?case=${row.id}`} className="block truncate font-medium hover:text-primary">
                          {row.title}
                        </Link>
                        <span className="block font-mono text-[11px] text-muted-foreground md:hidden">{caseLabel(row.caseNumber)}</span>
                      </div>
                      <div role="cell" className="hidden md:block"><PriorityBadge priority={row.priority} /></div>
                      <div role="cell"><StatusBadge status={row.status} /></div>
                      <div role="cell" className="hidden truncate text-xs text-muted-foreground md:block">
                        {row.assignedToId ? (peopleById.get(row.assignedToId) ?? "Former member") : "Unassigned"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div>
          <div className="flex h-9 shrink-0 items-center justify-between border-t border-border px-4 text-xs text-muted-foreground">
            <span className="tabular-nums" aria-live="polite">{total.toLocaleString("en-US")} {total === 1 ? "case" : "cases"}</span>
            {nextCursor && <span className="tabular-nums">{rows.length.toLocaleString("en-US")} loaded</span>}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="glass-overlay absolute inset-x-2 bottom-11 z-10 flex flex-wrap items-center gap-1.5 rounded-xl p-2" role="toolbar" aria-label="Bulk actions">
            <span className="px-2 text-sm font-medium tabular-nums">{selected.size} selected</span>
            <Button variant="ghost" size="sm" onClick={() => setDialog("reassign")}>
              <UserRound /> Reassign
            </Button>
            <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setSelected(new Set())} aria-label="Clear selection">
              <X />
            </Button>
          </div>
        )}
      </GlassCard>

      <Dialog open={dialog === "reassign"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign {selected.size} case(s)</DialogTitle>
            <DialogDescription>Choose who should run them.</DialogDescription>
          </DialogHeader>
          <NativeSelect aria-label="Assignee" value={assigneeChoice} onChange={(event) => setAssigneeChoice(event.target.value)}>
            <option value={UNASSIGNED}>Unassigned</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </NativeSelect>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => void reassign()}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialog === "close"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Close this run?"
        description={`The run becomes read only and can't be reopened. ${counts.UNTESTED ? `${counts.UNTESTED} case(s) are still untested. ` : ""}You can still rerun failed cases afterward.`}
        confirmLabel="Close run"
        onConfirm={close}
      />
    </div>
  );
}
