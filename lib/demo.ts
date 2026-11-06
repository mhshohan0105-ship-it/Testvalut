/**
 * Turns a deployment into a public demo: one-click sign-in, no signups or uploads, and data that resets daily.
 * NEXT_PUBLIC_ so the browser and server agree. Never turn this on for a deployment with real data.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const DEMO_EMAIL = "demo@testvault.dev";

/** Above this many cases at once, a delete could empty the demo for everyone else until the next reset. */
export const DEMO_BULK_DELETE_LIMIT = 5;
