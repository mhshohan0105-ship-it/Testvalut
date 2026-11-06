"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeft, Folder } from "lucide-react";
import { toast } from "sonner";
import { PriorityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { FieldError, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Priority } from "@/generated/prisma/enums";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/constants/testing";
import { cn } from "@/lib/utils";
import { caseLabel } from "@/lib/utils/format";
import { flattenSections, sectionSubtreeIds, type SectionItem } from "@/lib/utils/tree";
import { serializeCaseQuery, DEFAULT_CASE_QUERY } from "@/lib/validations/case-query";
import { runFormSchema, type RunFormInput } from "@/lib/validations/run";
import { createRun } from "@/server/actions/runs";
import type { CaseRow } from "@/server/queries/cases";

const ROW_HEIGHT = 44;

type PickerCase = { sectionId: string; priority: Priority };
type PriorityCount = { sectionId: string; priority: Priority; count: number };

export function RunForm({
  project,
  sections,
  priorityCounts,
  milestones,
  people,
  defaultAssigneeId,
}: {
  project: { id: string; name: string };
  sections: SectionItem[];
  priorityCounts: PriorityCount[];
  milestones: { id: string; name: string }[];
  people: { id: string; name: string }[];
  defaultAssigneeId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<RunFormInput>({
    resolver: zodResolver(runFormSchema),
    defaultValues: { name: "", description: "", environment: "", milestoneId: "", assignedToId: defaultAssigneeId },
  });
  const { errors } = form.formState;

  const [includeAll, setIncludeAll] = useState(false);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [checkedSections, setCheckedSections] = useState<ReadonlySet<string>>(new Set());
  // Individual exceptions to the section checkboxes. Their section and priority keep the count correct.
  const [extraCases, setExtraCases] = useState<ReadonlyMap<string, PickerCase>>(new Map());
  const [excludedCases, setExcludedCases] = useState<ReadonlyMap<string, PickerCase>>(new Map());
  const [focusedSection, setFocusedSection] = useState<string | null>(null);

  const flat = useMemo(() => flattenSections(sections), [sections]);

  const matchesPriority = (priority: Priority) => priorities.length === 0 || priorities.includes(priority);
  const sectionIncluded = (sectionId: string) => includeAll || checkedSections.has(sectionId);

  const selectedCount = useMemo(() => {
    let count = 0;
    for (const group of priorityCounts) {
      if (sectionIncluded(group.sectionId) && matchesPriority(group.priority)) count += group.count;
    }
    for (const entry of extraCases.values()) {
      if (!sectionIncluded(entry.sectionId) && matchesPriority(entry.priority)) count++;
    }
    for (const entry of excludedCases.values()) {
      if (sectionIncluded(entry.sectionId) && matchesPriority(entry.priority)) count--;
    }
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers only read the state listed here
  }, [priorityCounts, includeAll, checkedSections, priorities, extraCases, excludedCases]);

  function toggleSection(id: string) {
    const subtree = sectionSubtreeIds(sections, id);
    const next = new Set(checkedSections);
    const checking = !next.has(id);
    for (const sectionId of subtree) {
      if (checking) next.add(sectionId);
      else next.delete(sectionId);
    }
    setCheckedSections(next);
    // A section checkbox overrides earlier one-off choices inside it.
    const withoutSubtree = (entries: ReadonlyMap<string, PickerCase>) => new Map([...entries].filter(([, entry]) => !subtree.includes(entry.sectionId)));
    setExtraCases(withoutSubtree(extraCases));
    setExcludedCases(withoutSubtree(excludedCases));
  }

  function toggleCase(row: CaseRow) {
    const entry = { sectionId: row.sectionId, priority: row.priority };
    if (sectionIncluded(row.sectionId)) {
      const next = new Map(excludedCases);
      if (!next.delete(row.id)) next.set(row.id, entry);
      setExcludedCases(next);
    } else {
      const next = new Map(extraCases);
      if (!next.delete(row.id)) next.set(row.id, entry);
      setExtraCases(next);
    }
  }

  function isCaseChecked(row: CaseRow) {
    if (!matchesPriority(row.priority)) return false;
    return sectionIncluded(row.sectionId) ? !excludedCases.has(row.id) : extraCases.has(row.id);
  }

  const submit = form.handleSubmit((values) => {
    if (selectedCount <= 0) {
      toast.error("Select at least one case for this run.");
      return;
    }
    startTransition(async () => {
      const result = await createRun(project.id, values, {
        includeAll,
        sectionIds: [...checkedSections],
        caseIds: [...extraCases.keys()],
        excludedCaseIds: [...excludedCases.keys()],
        priorities,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Run created with ${selectedCount} case(s)`);
      router.push(`/runs/${result.data.id}`);
    });
  });

  return (
    <form onSubmit={submit} noValidate>
      <Link href="/runs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Test Runs
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">New run</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm tabular-nums" aria-live="polite">
            <span className="font-mono text-lg font-semibold">{Math.max(selectedCount, 0)}</span> <span className="text-muted-foreground">cases selected</span>
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create run"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <GlassCard className="h-fit space-y-4 p-5">
          <div>
            <Label htmlFor="run-name" className="mb-1.5">Name</Label>
            <Input id="run-name" autoFocus placeholder="Sprint 25 regression" className="h-10 rounded-xl" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <Label htmlFor="run-environment" className="mb-1.5">Environment</Label>
            <Input id="run-environment" placeholder="Chrome / Staging" className="h-10 rounded-xl" aria-invalid={Boolean(errors.environment)} {...form.register("environment")} />
            <FieldError message={errors.environment?.message} />
          </div>
          <div>
            <Label htmlFor="run-milestone" className="mb-1.5">Milestone</Label>
            <NativeSelect id="run-milestone" {...form.register("milestoneId")}>
              <option value="">No milestone</option>
              {milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="run-assignee" className="mb-1.5">Default assignee</Label>
            <NativeSelect id="run-assignee" {...form.register("assignedToId")}>
              <option value="">Unassigned</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="run-description" className="mb-1.5">Description</Label>
            <Textarea id="run-description" aria-invalid={Boolean(errors.description)} {...form.register("description")} />
            <FieldError message={errors.description?.message} />
          </div>
        </GlassCard>

        <GlassCard className="flex min-w-0 flex-col p-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border pb-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={includeAll}
                onChange={(event) => {
                  setIncludeAll(event.target.checked);
                  setExtraCases(new Map());
                  setExcludedCases(new Map());
                }}
              />
              Include all cases
            </label>
            <fieldset className="flex flex-wrap items-center gap-1.5">
              <legend className="sr-only">Only these priorities</legend>
              <span className="mr-1 text-xs text-muted-foreground" aria-hidden>Only:</span>
              {PRIORITIES.map((priority) => {
                const active = priorities.includes(priority);
                return (
                  <button
                    key={priority}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPriorities(active ? priorities.filter((entry) => entry !== priority) : [...priorities, priority])}
                    className={cn(
                      "rounded-lg border px-2 py-1 text-xs font-medium transition-colors",
                      active ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {PRIORITY_LABELS[priority]}
                  </button>
                );
              })}
            </fieldset>
          </div>

          <div className="grid min-h-0 gap-3 pt-3 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
            <ul className="h-96 overflow-y-auto pr-1" aria-label="Sections">
              {flat.map(({ item, depth }) => (
                <li
                  key={item.id}
                  className={cn("flex h-8 items-center gap-1.5 rounded-lg pr-1 transition-colors hover:bg-accent/60", focusedSection === item.id && "bg-accent")}
                  style={{ paddingLeft: depth * 14 + 6 }}
                >
                  <input
                    type="checkbox"
                    aria-label={`Include section ${item.name}`}
                    className="size-4 shrink-0 accent-primary"
                    checked={sectionIncluded(item.id)}
                    disabled={includeAll}
                    onChange={() => toggleSection(item.id)}
                  />
                  <button type="button" onClick={() => setFocusedSection(item.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm">
                    <Folder className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <PickerCaseList projectId={project.id} sectionId={focusedSection} isChecked={isCaseChecked} isDisabled={(row) => !matchesPriority(row.priority)} onToggle={toggleCase} />
          </div>
        </GlassCard>
      </div>
    </form>
  );
}

function PickerCaseList({
  projectId,
  sectionId,
  isChecked,
  isDisabled,
  onToggle,
}: {
  projectId: string;
  sectionId: string | null;
  isChecked: (row: CaseRow) => boolean;
  isDisabled: (row: CaseRow) => boolean;
  onToggle: (row: CaseRow) => void;
}) {
  const [loaded, setLoaded] = useState<{ sectionId: string; rows: CaseRow[]; nextCursor: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const requestedRef = useRef<string | null>(null);

  async function load(section: string, cursor?: string) {
    const params = serializeCaseQuery({ ...DEFAULT_CASE_QUERY, section });
    if (cursor) params.set("cursor", cursor);
    loadingRef.current = true;
    try {
      const response = await fetch(`/api/projects/${projectId}/cases?${params}`);
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { rows: CaseRow[]; nextCursor: string | null };
      setLoaded((current) => ({
        sectionId: section,
        rows: cursor && current?.sectionId === section ? [...current.rows, ...data.rows] : data.rows,
        nextCursor: data.nextCursor,
      }));
    } catch (error) {
      console.error(error);
      toast.error("Couldn't load cases for that section.");
    } finally {
      loadingRef.current = false;
    }
  }

  if (sectionId && requestedRef.current !== sectionId) {
    requestedRef.current = sectionId;
    void load(sectionId);
  }

  const rows = loaded?.sectionId === sectionId ? loaded.rows : [];
  // eslint-disable-next-line react-hooks/incompatible-library -- the virtualizer's functions aren't passed to memoized children
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => ROW_HEIGHT, overscan: 8 });

  if (!sectionId) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
        Tick sections to include them whole, or click a section name to pick individual cases.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-96 overflow-y-auto rounded-xl border border-border"
      onScroll={(event) => {
        const element = event.currentTarget;
        const near = element.scrollHeight - element.scrollTop - element.clientHeight < ROW_HEIGHT * 10;
        if (near && loaded?.nextCursor && !loadingRef.current) void load(sectionId, loaded.nextCursor);
      }}
    >
      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">No cases in this section.</p>
      ) : (
        <ul className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            const disabled = isDisabled(row);
            return (
              <li key={row.id} className="absolute inset-x-0 top-0" style={{ height: ROW_HEIGHT, transform: `translateY(${virtualRow.start}px)` }}>
                <label className={cn("flex h-full items-center gap-2.5 border-b border-border/60 px-3 text-sm hover:bg-accent/50", disabled && "opacity-50")}>
                  <input type="checkbox" className="size-4 shrink-0 accent-primary" checked={isChecked(row)} disabled={disabled} onChange={() => onToggle(row)} />
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{caseLabel(row.caseNumber)}</span>
                  <span className="min-w-0 flex-1 truncate">{row.title}</span>
                  <PriorityBadge priority={row.priority} />
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
