"use server";

import bcrypt from "bcryptjs";
import { AuthError, CredentialsSignin } from "next-auth";
import { Prisma } from "@/generated/prisma/client";
import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEMO_MODE } from "@/lib/demo";
import { safeCallbackUrl } from "@/lib/utils";
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from "@/lib/validations/auth";

export type AuthResult = { ok: false; error: string };

async function signInAndRedirect(email: string, password: string, redirectTo: string): Promise<AuthResult> {
  try {
    // Throws a redirect on success, which Next.js turns into a client navigation.
    await signIn("credentials", { email, password, redirectTo });
    return { ok: false, error: "Could not sign in. Please try again." };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error instanceof CredentialsSignin && error.code === "too_many_attempts") {
        return { ok: false, error: "Too many failed attempts. Please wait 15 minutes and try again." };
      }
      return { ok: false, error: "That email and password don't match an active account." };
    }
    throw error;
  }
}

export async function login(input: LoginInput, callbackUrl?: string): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email and password." };
  return signInAndRedirect(parsed.data.email, parsed.data.password, safeCallbackUrl(callbackUrl));
}

export async function signup(input: SignupInput): Promise<AuthResult> {
  if (DEMO_MODE) return { ok: false, error: "Sign-ups are turned off in this demo." };
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the form and try again." };
  const { name, email, password } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    // Serializable so two simultaneous first signups can't both become ADMIN.
    await db.$transaction(
      async (tx) => {
        const existingUsers = await tx.user.count();
        await tx.user.create({
          data: { name, email, passwordHash, role: existingUsers === 0 ? "ADMIN" : "VIEWER" },
          select: { id: true },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { ok: false, error: "An account with that email already exists." };
      if (error.code === "P2034") return { ok: false, error: "Something collided. Please try again." };
    }
    throw error;
  }

  return signInAndRedirect(email, password, "/dashboard");
}

export async function demoLogin(): Promise<AuthResult> {
  if (!DEMO_MODE) return { ok: false, error: "The demo isn't available here." };
  try {
    await signIn("demo", { redirectTo: "/dashboard" });
    return { ok: false, error: "Could not start the demo. Please try again." };
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, error: "The demo is being reset. Please try again in a minute." };
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
