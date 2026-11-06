import { z } from "zod";
import { Priority, TestStatus } from "@/generated/prisma/enums";

export const runFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a run name").max(200, "Keep it under 200 characters"),
  description: z.string().trim().max(2000, "Keep it under 2000 characters"),
  environment: z.string().trim().max(200, "Keep it under 200 characters"),
  milestoneId: z.string(),
  assignedToId: z.string(),
});

export type RunFormInput = z.infer<typeof runFormSchema>;

const ids = z.array(z.string().min(1)).max(20000);

export const runSelectionSchema = z.object({
  includeAll: z.boolean(),
  sectionIds: ids,
  caseIds: ids,
  excludedCaseIds: ids,
  priorities: z.array(z.enum(Priority)),
});

export type RunSelection = z.infer<typeof runSelectionSchema>;

export const recordResultSchema = z.object({
  runCaseId: z.string().min(1),
  status: z.enum(TestStatus).refine((status) => status !== "UNTESTED", "Choose a result"),
  comment: z.string().trim().max(5000, "Keep the comment under 5000 characters"),
  actualResult: z.string().trim().max(5000, "Keep the actual result under 5000 characters"),
  defectRef: z.string().trim().max(500, "Keep the defect reference under 500 characters"),
  elapsedSeconds: z.number().int().min(0).max(1000000),
  stepResults: z.array(z.object({ order: z.number().int().min(0), status: z.enum(["PASSED", "FAILED"]) })).max(200),
});

export type RecordResultInput = z.infer<typeof recordResultSchema>;

export const reassignSchema = z.object({
  runId: z.string().min(1),
  runCaseIds: z.array(z.string().min(1)).min(1, "Select at least one case").max(5000),
  assignedToId: z.string().min(1).nullable(),
});
