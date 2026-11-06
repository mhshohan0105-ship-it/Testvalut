"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError, Textarea } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROJECT_COLORS } from "@/lib/constants/testing";
import { projectFormSchema, type ProjectFormInput } from "@/lib/validations/project";
import { createProject, updateProject } from "@/server/actions/projects";

function keyFromName(name: string) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  const key = words.length > 1 ? words.map((word) => word[0]).join("") : (words[0] ?? "");
  return key.replace(/^[0-9]+/, "").slice(0, words.length > 1 ? 6 : 3);
}

export function ProjectFormDialog({
  project,
  open,
  onOpenChange: setOpen,
}: {
  project?: ProjectFormInput & { id: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ProjectFormInput>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: project ?? { name: "", key: "", description: "", color: PROJECT_COLORS[0] },
  });
  const { errors } = form.formState;

  const nameField = form.register("name", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!project && !form.formState.dirtyFields.key) form.setValue("key", keyFromName(event.target.value));
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = project ? await updateProject(project.id, values) : await createProject(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(project ? "Project updated" : "Project created");
      setOpen(false);
      if (!project) {
        form.reset();
        if (result.data) router.push(`/projects/${result.data.id}`);
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
            <DialogDescription>The key appears on reports and helps people recognize the project.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <div>
              <Label htmlFor="project-name" className="mb-1.5">Name</Label>
              <Input id="project-name" aria-invalid={Boolean(errors.name)} {...nameField} />
              <FieldError message={errors.name?.message} />
            </div>
            <div>
              <Label htmlFor="project-key" className="mb-1.5">Key</Label>
              <Input id="project-key" className="font-mono uppercase" maxLength={6} aria-invalid={Boolean(errors.key)} {...form.register("key")} />
              <FieldError message={errors.key?.message} />
            </div>
          </div>
          <div>
            <Label htmlFor="project-description" className="mb-1.5">Description</Label>
            <Textarea id="project-description" aria-invalid={Boolean(errors.description)} {...form.register("description")} />
            <FieldError message={errors.description?.message} />
          </div>
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">Color</legend>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => field.onChange(color)}
                      aria-label={`Color ${color}`}
                      aria-pressed={field.value === color}
                      className="flex size-8 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: color }}
                    >
                      {field.value === color && <Check className="size-4" aria-hidden />}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
