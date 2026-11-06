"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { ArrowDown, ArrowUp, ChevronRight, CornerLeftUp, Folder, FolderPlus, Layers, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { flattenSections, moveSectionInList, sectionSubtreeIds, type SectionItem } from "@/lib/utils/tree";
import { createSection, deleteSection, moveSection, renameSection } from "@/server/actions/sections";

type DropPosition = "before" | "inside" | "after";
type DropTarget = { id: string; position: DropPosition };
type NameDialog = { mode: "create"; parentId: string | null } | { mode: "rename"; section: SectionItem };

export function SectionTree({
  projectId,
  sections,
  counts,
  selectedId,
  canManage,
  onSectionsChange,
  onSelect,
  onDeleted,
}: {
  projectId: string;
  sections: SectionItem[];
  counts: Record<string, number>;
  selectedId: string | null;
  canManage: boolean;
  onSectionsChange: (next: SectionItem[]) => void;
  onSelect: (id: string | null) => void;
  onDeleted: (deletedIds: string[]) => void;
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [nameDialog, setNameDialog] = useState<NameDialog | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [toDelete, setToDelete] = useState<SectionItem | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  // Read in drag handlers, which fire far too often to go through state.
  const dropTargetRef = useRef<DropTarget | null>(null);

  const rows = useMemo(() => flattenSections(sections, collapsed), [sections, collapsed]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    for (const section of sections) {
      result[section.id] = sectionSubtreeIds(sections, section.id).reduce((sum, id) => sum + (counts[id] ?? 0), 0);
    }
    return result;
  }, [sections, counts]);
  const totalCases = useMemo(() => Object.values(counts).reduce((sum, count) => sum + count, 0), [counts]);

  /** Applies a move to the tree immediately, then rolls back with a toast if the server refuses. */
  async function applyMove(id: string, parentId: string | null, index: number) {
    const previous = sections;
    onSectionsChange(moveSectionInList(sections, id, parentId, index));
    if (parentId) setCollapsed((current) => withoutId(current, parentId));
    const result = await moveSection(projectId, { sectionId: id, parentId, index });
    if (!result.ok) {
      onSectionsChange(previous);
      toast.error(result.error);
    }
  }

  function siblingsOf(parentId: string | null) {
    return sections.filter((section) => section.parentId === parentId).sort((a, b) => a.order - b.order);
  }

  function updateDropTarget(event: DragMoveEvent | DragOverEvent) {
    const { over, active, delta, activatorEvent } = event;
    let next: DropTarget | null = null;
    if (over && over.id !== active.id && "clientY" in activatorEvent) {
      const overId = String(over.id);
      if (!sectionSubtreeIds(sections, String(active.id)).includes(overId)) {
        const pointerY = (activatorEvent as PointerEvent).clientY + delta.y;
        const ratio = (pointerY - over.rect.top) / over.rect.height;
        next = { id: overId, position: ratio < 0.28 ? "before" : ratio > 0.72 ? "after" : "inside" };
      }
    }
    if (next?.id !== dropTargetRef.current?.id || next?.position !== dropTargetRef.current?.position) {
      dropTargetRef.current = next;
      setDropTarget(next);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const target = dropTargetRef.current;
    const id = String(event.active.id);
    dropTargetRef.current = null;
    setDropTarget(null);
    setDraggingId(null);
    if (!target) return;

    const over = sections.find((section) => section.id === target.id);
    if (!over) return;
    if (target.position === "inside") {
      void applyMove(id, over.id, siblingsOf(over.id).filter((section) => section.id !== id).length);
      return;
    }
    const siblings = siblingsOf(over.parentId).filter((section) => section.id !== id);
    const overIndex = siblings.findIndex((section) => section.id === over.id);
    void applyMove(id, over.parentId, target.position === "before" ? overIndex : overIndex + 1);
  }

  function openNameDialog(dialog: NameDialog) {
    setNameValue(dialog.mode === "rename" ? dialog.section.name : "");
    setNameDialog(dialog);
  }

  async function submitName(event: React.FormEvent) {
    event.preventDefault();
    const dialog = nameDialog;
    const name = nameValue.trim();
    if (!dialog || !name) return;
    setNameDialog(null);

    if (dialog.mode === "rename") {
      const previous = sections;
      onSectionsChange(sections.map((section) => (section.id === dialog.section.id ? { ...section, name } : section)));
      const result = await renameSection(projectId, dialog.section.id, name);
      if (result.ok) {
        toast.success("Section renamed");
      } else {
        onSectionsChange(previous);
        toast.error(result.error);
      }
      return;
    }

    const temporaryId = `temp-${Date.now()}`;
    const optimistic = { id: temporaryId, parentId: dialog.parentId, name, order: siblingsOf(dialog.parentId).length };
    const previous = sections;
    onSectionsChange([...sections, optimistic]);
    if (dialog.parentId) setCollapsed((current) => withoutId(current, dialog.parentId as string));
    const result = await createSection(projectId, { name, parentId: dialog.parentId });
    if (result.ok) {
      onSectionsChange([...previous, result.data]);
      toast.success("Section created");
    } else {
      onSectionsChange(previous);
      toast.error(result.error);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const removed = sectionSubtreeIds(sections, toDelete.id);
    const previous = sections;
    onSectionsChange(sections.filter((section) => !removed.includes(section.id)));
    const result = await deleteSection(projectId, toDelete.id);
    if (result.ok) {
      toast.success("Section deleted");
      onDeleted(removed);
    } else {
      onSectionsChange(previous);
      toast.error(result.error);
    }
  }

  const dragging = sections.find((section) => section.id === draggingId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Sections</h2>
        {canManage && (
          <Button variant="ghost" size="icon-sm" onClick={() => openNameDialog({ mode: "create", parentId: null })} aria-label="New top-level section">
            <FolderPlus />
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-current={selectedId === null ? "true" : undefined}
          className={cn(
            "mb-0.5 flex h-8 w-full items-center gap-2 rounded-lg px-2 text-sm transition-colors hover:bg-accent",
            selectedId === null && "bg-accent font-medium",
          )}
        >
          <Layers className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="flex-1 truncate text-left">All cases</span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">{totalCases}</span>
        </button>

        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={(event) => setDraggingId(String(event.active.id))}
          onDragMove={updateDropTarget}
          onDragOver={updateDropTarget}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            dropTargetRef.current = null;
            setDropTarget(null);
            setDraggingId(null);
          }}
        >
          <ul>
            {rows.map(({ item, depth, hasChildren }) => {
              const siblings = siblingsOf(item.parentId);
              const position = siblings.findIndex((section) => section.id === item.id);
              const parent = sections.find((section) => section.id === item.parentId);
              return (
                <TreeRow
                  key={item.id}
                  item={item}
                  depth={depth}
                  hasChildren={hasChildren}
                  expanded={!collapsed.has(item.id)}
                  selected={selectedId === item.id}
                  count={totals[item.id] ?? 0}
                  canManage={canManage}
                  drop={dropTarget?.id === item.id ? dropTarget.position : null}
                  onToggle={() => setCollapsed((current) => (current.has(item.id) ? withoutId(current, item.id) : new Set(current).add(item.id)))}
                  onSelect={() => onSelect(item.id)}
                  onAddChild={() => openNameDialog({ mode: "create", parentId: item.id })}
                  onRename={() => openNameDialog({ mode: "rename", section: item })}
                  onDelete={() => setToDelete(item)}
                  onMoveUp={position > 0 ? () => void applyMove(item.id, item.parentId, position - 1) : undefined}
                  onMoveDown={position < siblings.length - 1 ? () => void applyMove(item.id, item.parentId, position + 1) : undefined}
                  onMoveOut={
                    item.parentId
                      ? () => {
                          const outer = siblingsOf(parent?.parentId ?? null);
                          void applyMove(item.id, parent?.parentId ?? null, outer.findIndex((section) => section.id === parent?.id) + 1);
                        }
                      : undefined
                  }
                />
              );
            })}
          </ul>
          <DragOverlay dropAnimation={null}>
            {dragging && (
              <div className="glass-overlay flex h-8 items-center gap-2 rounded-lg px-2 text-sm">
                <Folder className="size-4 text-primary" aria-hidden />
                <span className="truncate">{dragging.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {sections.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">No sections yet.{canManage ? " Create one to start adding cases." : ""}</p>}
      </div>

      <Dialog open={nameDialog !== null} onOpenChange={(open) => !open && setNameDialog(null)}>
        <DialogContent>
          <form onSubmit={submitName} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{nameDialog?.mode === "rename" ? "Rename section" : "New section"}</DialogTitle>
            </DialogHeader>
            <div>
              <Label htmlFor="section-name" className="mb-1.5">Name</Label>
              <Input id="section-name" autoFocus maxLength={120} value={nameValue} onChange={(event) => setNameValue(event.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNameDialog(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!nameValue.trim()}>
                {nameDialog?.mode === "rename" ? "Rename" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "section"}?`}
        description={`This permanently deletes the section, anything nested in it, ${toDelete ? (totals[toDelete.id] ?? 0) : 0} test case(s), and their results in every run.`}
        confirmLabel="Delete section"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function withoutId(set: ReadonlySet<string>, id: string) {
  const next = new Set(set);
  next.delete(id);
  return next;
}

function TreeRow({
  item,
  depth,
  hasChildren,
  expanded,
  selected,
  count,
  canManage,
  drop,
  onToggle,
  onSelect,
  onAddChild,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveOut,
}: {
  item: SectionItem;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  selected: boolean;
  count: number;
  canManage: boolean;
  drop: DropPosition | null;
  onToggle: () => void;
  onSelect: () => void;
  onAddChild: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveOut?: () => void;
}) {
  const { setNodeRef: setDropRef } = useDroppable({ id: item.id });
  const { setNodeRef: setDragRef, attributes, listeners, isDragging } = useDraggable({ id: item.id, disabled: !canManage });

  return (
    <li
      ref={setDropRef}
      className={cn(
        "group relative flex h-8 items-center rounded-lg transition-colors",
        selected && "bg-accent",
        !selected && "hover:bg-accent/60",
        isDragging && "opacity-40",
        drop === "inside" && "bg-primary/20 ring-1 ring-primary",
      )}
      style={{ paddingLeft: depth * 14 }}
    >
      {drop === "before" && <span className="absolute inset-x-1 -top-px h-0.5 rounded-full bg-primary" aria-hidden />}
      {drop === "after" && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary" aria-hidden />}
      <button
        type="button"
        onClick={onToggle}
        className={cn("flex size-5 shrink-0 items-center justify-center rounded", !hasChildren && "invisible")}
        aria-label={expanded ? `Collapse ${item.name}` : `Expand ${item.name}`}
        aria-expanded={expanded}
        tabIndex={hasChildren ? 0 : -1}
      >
        <ChevronRight className={cn("size-3.5 transition-transform duration-150", expanded && "rotate-90")} aria-hidden />
      </button>
      <button
        ref={setDragRef}
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        // The menu offers the same moves for keyboard users, so the drag handle keeps normal button semantics.
        {...listeners}
        aria-pressed={attributes["aria-pressed"]}
        className={cn("flex h-full min-w-0 flex-1 touch-pan-y items-center gap-1.5 pr-1 text-left text-sm", selected && "font-medium")}
      >
        <Folder className={cn("size-3.5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} aria-hidden />
        <span className="flex-1 truncate">{item.name}</span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{count}</span>
      </button>
      {canManage && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            className="mr-0.5 flex size-6 shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent focus-visible:opacity-100 data-[state=open]:opacity-100 max-lg:opacity-100"
            aria-label={`Actions for ${item.name}`}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onSelect={onAddChild}>
              <FolderPlus /> Add subsection
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onRename}>
              <Pencil /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!onMoveUp} onSelect={onMoveUp}>
              <ArrowUp /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!onMoveDown} onSelect={onMoveDown}>
              <ArrowDown /> Move down
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!onMoveOut} onSelect={onMoveOut}>
              <CornerLeftUp /> Move out one level
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
