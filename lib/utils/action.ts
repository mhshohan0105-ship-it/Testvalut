import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/** An error whose message is safe to show to the user. */
export class ActionError extends Error {}

/** Wraps a server action body so every failure reaches the client as a friendly message. */
export async function runAction<T>(body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Please check the form and try again." };
    if (error instanceof ActionError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
