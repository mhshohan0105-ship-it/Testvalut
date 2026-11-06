import { z } from "zod";
import { Role } from "@/generated/prisma/enums";
import { signupSchema } from "./auth";

export const addUserSchema = z.object({
  name: signupSchema.shape.name,
  email: signupSchema.shape.email,
  role: z.enum(Role),
});

export type AddUserInput = z.infer<typeof addUserSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(200),
  newPassword: signupSchema.shape.password,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
