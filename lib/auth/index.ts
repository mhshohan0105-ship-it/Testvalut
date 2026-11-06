import "server-only";
import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "./config";
import { clearLoginFailures, isLoginLocked, recordLoginFailure } from "./login-attempts";

/** Thrown inside authorize, so the limit also covers direct calls to the Auth.js endpoint. */
export class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email } = parsed.data;
        if (await isLoginLocked(email)) throw new TooManyAttempts();

        const user = await db.user.findUnique({
          where: { email },
          select: { id: true, name: true, email: true, role: true, passwordHash: true, deactivatedAt: true },
        });
        const valid = user && !user.deactivatedAt && (await bcrypt.compare(parsed.data.password, user.passwordHash));
        if (!valid) {
          await recordLoginFailure(email);
          return null;
        }
        await clearLoginFailures(email);

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
});
