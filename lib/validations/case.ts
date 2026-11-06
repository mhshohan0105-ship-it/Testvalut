import { z } from "zod";
import { CaseType, Priority } from "@/generated/prisma/enums";

export const caseStepSchema = z.object({
  action: z.string().trim().min(1, "Describe the action, or remove this step").max(5000),
  expectedResult: z.string().trim().max(5000),
});

export const caseFormSchema = z.object({
  title: z.string().trim().min(3, "Enter a title of at least 3 characters").max(300, "Keep it under 300 characters"),
  sectionId: z.string().min(1, "Choose a section"),
  priority: z.enum(Priority),
  type: z.enum(CaseType),
  estimate: z.number("Enter minutes as a number").int("Use whole minutes").min(0, "Can't be negative").max(100000).nullable(),
  references: z.string().trim().max(500),
  tags: z.array(z.string().trim().min(1).max(40)).max(20, "Use at most 20 tags"),
  preconditions: z.string().max(20000),
  steps: z.array(caseStepSchema).max(200, "Use at most 200 steps"),
});

export type CaseFormInput = z.infer<typeof caseFormSchema>;

const ids = z.array(z.string().min(1)).min(1, "Select at least one case").max(1000, "Select at most 1000 cases at once");

export const bulkCasesSchema = z.object({ projectId: z.string().min(1), caseIds: ids });

export const importRowSchema = z.object({
  title: z.string().trim().min(1).max(300),
  section: z.string().trim().max(500),
  priority: z.enum(Priority),
  type: z.enum(CaseType),
  estimate: z.number().int().min(0).max(100000).nullable(),
  references: z.string().trim().max(500),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  preconditions: z.string().max(20000),
  steps: z.array(caseStepSchema).max(200),
});

export type ImportRow = z.infer<typeof importRowSchema>;

/** What a TestCaseVersion stores. History diffs compare two of these. */
export const caseSnapshotSchema = z.object({
  title: z.string(),
  section: z.string(),
  preconditions: z.string().nullable(),
  priority: z.enum(Priority),
  type: z.enum(CaseType),
  estimate: z.number().nullable(),
  references: z.string().nullable(),
  tags: z.array(z.string()),
  steps: z.array(z.object({ action: z.string(), expectedResult: z.string() })),
});

export type CaseSnapshot = z.infer<typeof caseSnapshotSchema>;

export function normalizeTags(tags: string[]) {
  const seen = new Set<string>();
  for (const tag of tags) {
    const clean = tag.trim().toLowerCase().replace(/[,;]/g, "");
    if (clean) seen.add(clean.slice(0, 40));
  }
  return [...seen].slice(0, 20);
}
