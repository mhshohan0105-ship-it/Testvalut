import type { Metadata } from "next";
import { PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Test Runs" };

export default function Page() {
  return (
    <>
      <PageHeader title="Test Runs" description="Plan, execute and track test runs." />
      <EmptyState icon={PlayCircle} title="Coming in Phase 3" description="This screen is on the build plan and isn't available yet." />
    </>
  );
}
