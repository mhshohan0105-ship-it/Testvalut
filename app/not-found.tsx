import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-gradient font-mono text-7xl font-bold tabular-nums">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">This page isn&apos;t in the vault</h1>
      <p className="max-w-sm text-muted-foreground">The link may be out of date, or the item may have been moved or deleted.</p>
      <Button asChild className="mt-2">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </main>
  );
}
