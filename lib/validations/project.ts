import { z } from "zod";
import { Role } from "@/generated/prisma/enums";

export const projectFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a project name").max(80, "Keep it under 80 characters"),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,5}$/, "Use 2 to 6 letters or numbers, starting with a letter"),
  description: z.string().trim().max(500, "Keep it under 500 characters"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color"),
});

export type ProjectFormInput = z.infer<typeof projectFormSchema>;

export const memberInputSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(Role),
});
