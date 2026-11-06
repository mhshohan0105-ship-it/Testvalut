import { z } from "zod";

const email = z.email("Enter a valid email address").trim().toLowerCase();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "Keep it under 80 characters"),
  email,
  // bcrypt only uses the first 72 bytes of a password.
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .refine((value) => new TextEncoder().encode(value).length <= 72, "Use at most 72 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
