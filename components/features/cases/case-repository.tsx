"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Download,
  FolderInput,
  FolderTree,
  ListChecks,
  PlayCircle,
  Plus,
  Search,
  SignalHigh,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PriorityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/form-controls";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { Priority } from "@/generated/prisma/enums";
import { CASE_TYPES, CASE_TYPE_LABELS, PRIORITIES, PRIORITY_LABELS } from "@/lib/constants/testing";
import { cn } from "@/lib/utils";
import { caseLabel, formatDate } from "@/lib/utils/format";
import { sectionOptions, sectionSubtreeIds, type SectionItem } from "@/lib/utils/tree";
import { DEFAULT_CASE_QUERY, serializeCaseQuery, type CaseQuery, type SortField } from "@/lib/validations/case-query";
import { addCasesToRun, bulkDeleteCases, bulkMoveCases, bulkSetPriority } from "@/server/actions/cases";
import type { CaseRow } from "@/server/queries/cases";
import { SectionTree } from "./section-tree";

const ImportDialog = dynamic(() => import("./import-dialog").then((mod) => mod.ImportDialog), { ssr: false });

const ROW_HEIGHT = 48;
const SEARCH_DEBOUNCE_MS = 250;
const GRID = "grid grid-cols-[2.25rem_1fr_6rem] md:grid-cols-[2.25rem_4.75rem_1fr_6.5rem_7rem] xl:grid-cols-[2.25rem_4.75rem_1fr_6.5rem_7rem_6.5rem] items-center";

type ListResponse = { rows: CaseRow[]; nextCursor: string | null; total: number | null };

export function CaseRepository({
  project,
  initialSections,
  initialCounts,
  initialList,
  initialQuery,
  tags,
  activeRuns,
  canManage,
  canManageRuns,
}: {
  project: { id: string; name: string };
  initialSections: SectionItem[];
  initialCounts: Record<string, number>;
  initialList: ListResponse;
  initialQuery: CaseQuery;
  tags: string[];
  activeRuns: { id: string; name: string }[];
  canManage: boolean;
  canManageRuns: boolean;
}) {
  const [sections, setSections] = useState(initialSections);
  const [counts, setCounts] = useState(initialCounts);
  const [query, setQuery] = useState(initialQuery);
  const [searchText, setSearchText] = useState(initialQuery.q);
  const [rows, setRows] = useState(initialList.rows);
  const [total, setTotal] = useState(initialList.total ?? 0);
  const [nextCursor, setNextCursor] = useState(initialList.nextCursor);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [dialog, setDialog] = useState<"move" | "run" | "delete" | "import" | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // eslint-disable-next-line react-hooks/incompatible-library -- the virtualizer's functions aren't passed to memoized children
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => ROW_HEIGHT, overscan: 10 });

  function casesUrl(activeQuery: CaseQuery, cursor?: string) {
    const params = serializeCaseQuery(activeQuery);
    if (cursor) params.set("cursor", cursor);
    return `/api/projects/${project.id}/cases?${params}`;
  }

  async function load(activeQuery: CaseQuery) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const response = await fetch(casesUrl(activeQuery), { signal: controller.signal });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as ListResponse;
      setRows(data.rows);
      setTotal(data.total ?? 0);
      setNextCursor(data.nextCursor);
      setSelected(new Set());
      scrollRef.current?.scrollTo({ top: 0 });
      setLoading(false);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error(error);
      toast.error("Couldn't load cases. Please try again.");
      setLoading(false);
    }
  }

  function applyQuery(next: CaseQuery) {
    setQuery(next);
    // Keeps the filters in the URL, so they survive a refresh and can be shared, without a server round trip.
    const params = serializeCaseQuery(next).toString();
    window.history.replaceState(null, "", params ? `/cases?${params}` : "/cases");
    void load(next);
  }

  function onSearchChange(value: string) {
    setSearchText(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => applyQuery({ ...query, q: value.trim() }), SEARCH_DEBOUNCE_MS);
  }

  async function loadMore() {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const response = await fetch(casesUrl(query, nextCursor));
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

  function onScroll(event: React.UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    if (element.scrollHeight - element.scrollTop - element.clientHeight < ROW_HEIGHT * 20) void loadMore();
  }

  async function refreshTree() {
    const response = await fetch(`/api/projects/${project.id}/sections`);
    if (!response.ok) return;
    const data = (await response.json()) as { sections: SectionItem[]; counts: Record<string, number> };
    setSections(data.sections);
    setCounts(data.counts);
  }

  function toggleSort(field: SortField) {
    const dir = query.sort === field && query.dir === "asc" ? "desc" : "asc";
    applyQuery({ ...query, sort: field, dir });
  }

  function toggleInList<T extends string>(list: T[], value: T) {
    return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
  }

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  const allLoadedSelected = rows.length > 0 && selected.size === rows.length;
  const selectedIds = [...selected];
  const hasFilters = query.q || query.section || query.priorities.length || query.types.length || query.tags.length;
  const exportParams = serializeCaseQuery(query).toString();
  const newCaseHref = query.section ? `/cases/new?section=${query.section}` : "/cases/new";

  /** Updates the visible rows at once and restores them if the server refuses. */
  async function optimistic<T>(apply: (current: CaseRow[]) => CaseRow[], send: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, success: (data: T) => string) {
    const previousRows = rows;
    const previousTotal = total;
    const next = apply(rows);
    setRows(next);
    setTotal(previousTotal - (previousRows.length - next.length));
    setSelected(new Set());
    const result = await send();
    if (!result.ok) {
      setRows(previousRows);
      setTotal(previousTotal);
      toast.error(result.error);
      return;
    }
    toast.success(success(result.data));
    void refreshTree();
  }

  function setPriority(priority: Priority) {
    const ids = new Set(selectedIds);
    void optimistic(
      (current) => current.map((row) => (ids.has(row.id) ? { ...row, priority } : row)),
      () => bulkSetPriority({ projectId: project.id, caseIds: selectedIds, priority }),
      () => `Priority set to ${PRIORITY_LABELS[priority]} on ${selectedIds.length} case(s)`,
    );
  }

  async function moveSelected(sectionId: string) {
    const ids = new Set(selectedIds);
    const visible = query.section ? sectionSubtreeIds(sections, query.section) : null;
    await optimistic(
      (current) =>
        visible && !visible.includes(sectionId)
          ? current.filter((row) => !ids.has(row.id))
          : current.map((row) => (ids.has(row.id) ? { ...row, sectionId } : row)),
      () => bulkMoveCases({ projectId: project.id, caseIds: selectedIds, sectionId }),
      () => `Moved ${selectedIds.length} case(s)`,
    );
  }

  async function deleteSelected() {
    const ids = new Set(selectedIds);
    await optimistic(
      (current) => current.filter((row) => !ids.has(row.id)),
      () => bulkDeleteCases({ projectId: project.id, caseIds: selectedIds }),
      (data) => `Deleted ${data.count} case(s)`,
    );
  }

  async function addToRun(runId: string) {
    const result = await addCasesToRun({ projectId: project.id, caseIds: selectedIds, runId });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const { added, skipped, runName } = result.data;
    toast.success(`Added ${added} case(s) to ${runName}${skipped ? `. ${skipped} were already in it.` : ""}`);
    setSelected(new Set());
  }

  const tree = (
    <SectionTree
      projectId={project.id}
      sections={sections}
      counts={counts}
      selectedId={query.section}
      canManage={canManage}
      onSectionsChange={setSections}
      onSelect={(section) => {
        setTreeOpen(false);
        applyQuery({ ...query, section });
      }}
      onDeleted={(deleted) => {
        void refreshTree();
        applyQuery({ ...query, section: query.section && deleted.includes(query.section) ? null : query.section });
      }}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Test Cases</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">{project.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <a href={`/api/projects/${project.id}/cases/export${exportParams ? `?${exportParams}` : ""}`} download>
              <Download /> Export
            </a>
          </Button>
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setDialog("import")}>
                <Upload /> Import
              </Button>
              <Button asChild>
                <Link href={newCaseHref}>
                  <Plus /> New case
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <GlassCard className="hidden h-[calc(100dvh-13.5rem)] min-h-96 p-3 lg:block">{tree}</GlassCard>

        <Sheet open={treeOpen} onOpenChange={setTreeOpen}>
          <SheetContent side="bottom" className="h-[70dvh] rounded-t-3xl p-4">
            <SheetTitle className="sr-only">Sections</SheetTitle>
            {tree}
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="lg:hidden" onClick={() => setTreeOpen(true)}>
              <FolderTree /> Sections
            </Button>
            <div className="relative min-w-44 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={searchText}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search by title or C-number"
                aria-label="Search test cases"
                className="rounded-xl pl-9"
              />
            </div>
            <FilterMenu
              label="Priority"
              options={PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }))}
              selected={query.priorities}
              onToggle={(value) => applyQuery({ ...query, priorities: toggleInList(query.priorities, value as Priority) })}
            />
            <FilterMenu
              label="Type"
              options={CASE_TYPES.map((value) => ({ value, label: CASE_TYPE_LABELS[value] }))}
              selected={query.types}
              onToggle={(value) => applyQuery({ ...query, types: toggleInList(query.types, value as (typeof CASE_TYPES)[number]) })}
            />
            <FilterMenu
              label="Tags"
              options={tags.map((value) => ({ value, label: value }))}
              selected={query.tags}
              onToggle={(value) => applyQuery({ ...query, tags: toggleInList(query.tags, value) })}
            />
            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearTimeout(searchTimerRef.current);
                  setSearchText("");
                  applyQuery({ ...DEFAULT_CASE_QUERY, sort: query.sort, dir: query.dir });
                }}
              >
                <X /> Clear
              </Button>
            ) : null}
          </div>

          <GlassCard className="relative overflow-hidden">
            <div className="flex h-[calc(100dvh-17rem)] min-h-96 flex-col">
              <div role="table" aria-label="Test cases" aria-rowcount={total + 1} className="flex min-h-0 flex-1 flex-col">
              <div role="row" className={cn(GRID, "h-10 shrink-0 border-b border-border px-2 text-xs font-medium text-muted-foreground")}>
                <div role="columnheader" className="flex justify-center">
                  <input
                    type="checkbox"
                    aria-label="Select all loaded cases"
                    className="size-4 accent-primary"
                    checked={allLoadedSelected}
                    onChange={() => setSelected(allLoadedSelected ? new Set() : new Set(rows.map((row) => row.id)))}
                    disabled={!canManage}
                  />
                </div>
                <SortHeader label="ID" field="caseNumber" query={query} onSort={toggleSort} className="hidden md:block" />
                <SortHeader label="Title" field="title" query={query} onSort={toggleSort} />
                <SortHeader label="Priority" field="priority" query={query} onSort={toggleSort} />
                <SortHeader label="Type" field="type" query={query} onSort={toggleSort} className="hidden md:block" />
                <SortHeader label="Updated" field="updatedAt" query={query} onSort={toggleSort} className="hidden xl:block" />
              </div>

              <div ref={scrollRef} role="presentation" onScroll={onScroll} className={cn("min-h-0 flex-1 overflow-y-auto transition-opacity duration-150", loading && "opacity-60")}>
                {rows.length === 0 && !loading ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                    <ListChecks className="size-8 text-primary" aria-hidden />
                    <p className="font-semibold">{hasFilters ? "No cases match these filters" : "No test cases yet"}</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      {hasFilters ? "Try removing a filter or searching for something else." : canManage ? "Add your first case or import a CSV." : "Cases will appear here once a lead adds them."}
                    </p>
                  </div>
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
                          className={cn(
                            GRID,
                            "absolute top-0 left-0 w-full border-b border-border/60 px-2 text-sm transition-colors hover:bg-accent/50",
                            isSelected && "bg-primary/10",
                          )}
                          style={{ height: ROW_HEIGHT, transform: `translateY(${virtualRow.start}px)` }}
                        >
                          <div role="cell" className="flex justify-center">
                            <input
                              type="checkbox"
                              aria-label={`Select ${caseLabel(row.caseNumber)}`}
                              className="size-4 accent-primary"
                              checked={isSelected}
                              onChange={() => toggleRow(row.id)}
                              disabled={!canManage}
                            />
                          </div>
                          <div role="cell" className="hidden font-mono text-xs text-muted-foreground tabular-nums md:block">
                            {caseLabel(row.caseNumber)}
                          </div>
                          <div role="cell" className="min-w-0 pr-3">
                            <Link href={`/cases/${row.id}`} className="block truncate font-medium hover:text-primary">
                              {row.title}
                            </Link>
                            <span className="block font-mono text-[11px] text-muted-foreground tabular-nums md:hidden">{caseLabel(row.caseNumber)}</span>
                          </div>
                          <div role="cell">
                            <PriorityBadge priority={row.priority} />
                          </div>
                          <div role="cell" className="hidden text-xs text-muted-foreground md:block">
                            {CASE_TYPE_LABELS[row.type]}
                          </div>
                          <div role="cell" className="hidden text-xs text-muted-foreground xl:block">
                            {formatDate(row.updatedAt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {loading && rows.length === 0 && (
                  <div className="space-y-2 p-3" aria-busy="true">
                    {Array.from({ length: 6 }, (_, index) => (
                      <Skeleton key={index} className="h-8 rounded-lg" />
                    ))}
                  </div>
                )}
              </div>

              </div>
              <div className="flex h-9 shrink-0 items-center justify-between border-t border-border px-4 text-xs text-muted-foreground">
                <span className="tabular-nums" aria-live="polite">
                  {total.toLocaleString("en-US")} {total === 1 ? "case" : "cases"}
                </span>
                {nextCursor && <span className="tabular-nums">{rows.length.toLocaleString("en-US")} loaded</span>}
              </div>
            </div>

            {selected.size > 0 && (
              <div className="glass-overlay absolute inset-x-2 bottom-11 z-10 flex flex-wrap items-center gap-1.5 rounded-xl p-2" role="toolbar" aria-label="Bulk actions">
                <span className="px-2 text-sm font-medium tabular-nums">{selected.size} selected</span>
                <Button variant="ghost" size="sm" onClick={() => setDialog("move")}>
                  <FolderInput /> Move
                </Button>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <SignalHigh /> Priority
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {PRIORITIES.map((priority) => (
                      <DropdownMenuItem key={priority} onSelect={() => setPriority(priority)}>
                        {PRIORITY_LABELS[priority]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {canManageRuns && (
                  <Button variant="ghost" size="sm" onClick={() => setDialog("run")}>
                    <PlayCircle /> Add to run
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDialog("delete")}>
                  <Trash2 /> Delete
                </Button>
                <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setSelected(new Set())} aria-label="Clear selection">
                  <X />
                </Button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      <PickDialog
        open={dialog === "move"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Move ${selected.size} case(s)`}
        description="Choose the section to move them to."
        label="Section"
        options={sectionOptions(sections).map((option) => ({ value: option.id, label: option.label }))}
        confirmLabel="Move"
        onConfirm={moveSelected}
      />
      <PickDialog
        open={dialog === "run"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Add ${selected.size} case(s) to a run`}
        description={activeRuns.length ? "Cases already in the run are skipped." : "This project has no active runs right now."}
        label="Active run"
        options={activeRuns.map((run) => ({ value: run.id, label: run.name }))}
        confirmLabel="Add to run"
        onConfirm={addToRun}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Delete ${selected.size} case(s)?`}
        description="This permanently deletes the selected cases, along with their history, comments and results in every run."
        confirmLabel="Delete cases"
        destructive
        onConfirm={deleteSelected}
      />
      {dialog === "import" && (
        <ImportDialog
          projectId={project.id}
          onClose={() => setDialog(null)}
          onImported={() => {
            void refreshTree();
            void load(query);
          }}
        />
      )}
    </div>
  );
}

function SortHeader({
  label,
  field,
  query,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  query: CaseQuery;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = query.sort === field;
  const Icon = query.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <div role="columnheader" aria-sort={active ? (query.dir === "asc" ? "ascending" : "descending") : "none"} className={className}>
      <button type="button" onClick={() => onSort(field)} className={cn("inline-flex items-center gap-1 rounded hover:text-foreground", active && "text-foreground")}>
        {label}
        {active && <Icon className="size-3" aria-hidden />}
      </button>
    </div>
  );
}

function FilterMenu({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn(selected.length > 0 && "border-primary/60")}>
          {label}
          {selected.length > 0 && <span className="rounded-md bg-primary px-1.5 font-mono text-[10px] text-primary-foreground tabular-nums">{selected.length}</span>}
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-72 w-48 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Filter by {label.toLowerCase()}</DropdownMenuLabel>
        {options.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">Nothing to filter by yet.</p>}
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={() => onToggle(option.value)}
            // Stay open, so several values can be picked in a row.
            onSelect={(event) => event.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PickDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  options,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  options: { value: string; label: string }[];
  confirmLabel: string;
  onConfirm: (value: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState("");
  const current = options.some((option) => option.value === value) ? value : (options[0]?.value ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <NativeSelect aria-label={label} value={current} onChange={(event) => setValue(event.target.value)} disabled={options.length === 0}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!current}
            onClick={() => {
              onOpenChange(false);
              void onConfirm(current);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
