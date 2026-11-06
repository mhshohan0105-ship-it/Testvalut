"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldError, Textarea } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { milestoneFormSchema, type MilestoneFormInput } from "@/lib/validations/milestone";
import { createMilestone, updateMilestone } from "@/server/actions/milestones";

export function MilestoneFormDialog({
  projectId,
  milestone,
  trigger,
}: {
  projectId: string;
  milestone?: MilestoneFormInput & { id: string };
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<MilestoneFormInput>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: milestone ?? { name: "", description: "", startDate: "", dueDate: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = milestone ? await updateMilestone(milestone.id, values) : await createMilestone(projectId, values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(milestone ? "Milestone updated" : "Milestone created");
      setOpen(false);
      if (!milestone && result.data) {
        form.reset();
        router.push(`/milestones/${result.data.id}`);
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{milestone ? "Edit milestone" : "New milestone"}</DialogTitle>
            <DialogDescription>Link runs to a milestone to track progress toward a release.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="milestone-name" className="mb-1.5">Name</Label>
            <Input id="milestone-name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="milestone-start" className="mb-1.5">Start date</Label>
              <Input id="milestone-start" type="date" {...form.register("startDate")} />
            </div>
            <div>
              <Label htmlFor="milestone-due" className="mb-1.5">Due date</Label>
              <Input id="milestone-due" type="date" aria-invalid={Boolean(errors.dueDate)} {...form.register("dueDate")} />
              <FieldError message={errors.dueDate?.message} />
            </div>
          </div>
          <div>
            <Label htmlFor="milestone-description" className="mb-1.5">Description</Label>
            <Textarea id="milestone-description" aria-invalid={Boolean(errors.description)} {...form.register("description")} />
            <FieldError message={errors.description?.message} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : milestone ? "Save changes" : "Create milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
