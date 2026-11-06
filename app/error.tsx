"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-sm font-medium text-status-failed">Something went wrong</p>
      <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t load this page</h1>
      <p className="max-w-sm text-muted-foreground">Your data is safe. Try again, and if it keeps happening, check back in a moment.</p>
      <Button onClick={reset} className="mt-2">
        Try again
      </Button>
    </main>
  );
}
