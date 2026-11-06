import "server-only";
import { db } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

/**
 * Counted in the database because serverless instances share no memory.
 * The limit is per email, so it stops password guessing against one account from any number of addresses.
 */
export async function isLoginLocked(email: string) {
  const failures = await db.loginAttempt.count({ where: { email, createdAt: { gte: new Date(Date.now() - WINDOW_MS) } } });
  return failures >= MAX_FAILURES;
}

export async function recordLoginFailure(email: string) {
  await db.$transaction([
    db.loginAttempt.deleteMany({ where: { email, createdAt: { lt: new Date(Date.now() - WINDOW_MS) } } }),
    db.loginAttempt.create({ data: { email }, select: { id: true } }),
  ]);
}

export async function clearLoginFailures(email: string) {
  await db.loginAttempt.deleteMany({ where: { email } });
}
