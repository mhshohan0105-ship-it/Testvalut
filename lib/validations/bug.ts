import { z } from "zod";
import { BugStatus, Priority } from "@/generated/prisma/enums";

export const bugFormSchema = z.object({
  title: z.string().trim().min(3, "Enter a title of at least 3 characters").max(300, "Keep it under 300 characters"),
  severity: z.enum(Priority),
  assignedToId: z.string(),
  environment: z.string().trim().max(200, "Keep it under 200 characters"),
  externalRef: z.string().trim().max(500, "Keep it under 500 characters"),
  description: z.string().trim().max(20000, "Keep it under 20000 characters"),
  stepsToReproduce: z.string().trim().max(20000, "Keep it under 20000 characters"),
  expectedResult: z.string().trim().max(20000, "Keep it under 20000 characters"),
  actualResult: z.string().trim().max(20000, "Keep it under 20000 characters"),
});

export type BugFormInput = z.infer<typeof bugFormSchema>;

export const bugLinksSchema = z.object({
  testCaseId: z.string().min(1).nullable(),
  runCaseId: z.string().min(1).nullable(),
  attachmentIds: z.array(z.string().min(1)).max(50),
});

export type BugLinks = z.infer<typeof bugLinksSchema>;

export const bugStatusSchema = z.enum(BugStatus);
