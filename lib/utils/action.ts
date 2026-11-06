import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { DEMO_MODE } from "@/lib/demo";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/** An error whose message is safe to show to the user. */
export class ActionError extends Error {}

/** For actions that could spoil the shared demo for the next visitor. */
export function assertNotDemo(message = "That's turned off in this demo, so everyone keeps the sample data.") {
  if (DEMO_MODE) throw new ActionError(message);
}

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
