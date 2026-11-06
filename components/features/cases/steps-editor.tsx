"use client";

import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldError, Textarea } from "@/components/ui/form-controls";
import type { CaseFormInput } from "@/lib/validations/case";

export function StepsEditor({ form }: { form: UseFormReturn<CaseFormInput> }) {
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "steps", keyName: "key" });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((field) => field.key === active.id);
    const to = fields.findIndex((field) => field.key === over.id);
    if (from !== -1 && to !== -1) move(from, to);
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={fields.map((field) => field.key)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {fields.map((field, index) => (
              <StepRow key={field.key} id={field.key} index={index} form={form} onRemove={() => remove(index)} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {fields.length === 0 && <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">No steps yet. Add the first one below.</p>}
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => append({ action: "", expectedResult: "" }, { shouldFocus: true })}>
        <Plus /> Add step
      </Button>
    </div>
  );
}

function StepRow({ id, index, form, onRemove }: { id: string; index: number; form: UseFormReturn<CaseFormInput>; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const error = form.formState.errors.steps?.[index]?.action?.message;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`glass relative flex gap-2 rounded-xl p-2 ${isDragging ? "z-10 opacity-80" : ""}`}
    >
      <div className="flex shrink-0 flex-col items-center gap-1 pt-1.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder step ${index + 1}. Press space, then use the arrow keys.`}
          className="flex size-6 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-accent active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{index + 1}</span>
      </div>
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
        <div>
          <Textarea aria-label={`Step ${index + 1} action`} placeholder="Action" className="min-h-16" aria-invalid={Boolean(error)} {...form.register(`steps.${index}.action`)} />
          <FieldError message={error} />
        </div>
        <Textarea aria-label={`Step ${index + 1} expected result`} placeholder="Expected result" className="min-h-16" {...form.register(`steps.${index}.expectedResult`)} />
      </div>
      <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" onClick={onRemove} aria-label={`Remove step ${index + 1}`}>
        <Trash2 />
      </Button>
    </li>
  );
}
