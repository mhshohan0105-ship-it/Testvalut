import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Test Cases" };

export default function Page() {
  return (
    <>
      <PageHeader title="Test Cases" description="Your case repository, organized by section." />
      <EmptyState icon={ListChecks} title="Coming in Phase 2" description="This screen is on the build plan and isn't available yet." />
    </>
  );
}
