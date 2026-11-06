import { z } from "zod";

const day = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")]);

export const milestoneFormSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a milestone name").max(200, "Keep it under 200 characters"),
    description: z.string().trim().max(2000, "Keep it under 2000 characters"),
    startDate: day,
    dueDate: day,
  })
  .refine((values) => !values.startDate || !values.dueDate || values.startDate <= values.dueDate, {
    message: "The due date can't be before the start date",
    path: ["dueDate"],
  });

export type MilestoneFormInput = z.infer<typeof milestoneFormSchema>;
