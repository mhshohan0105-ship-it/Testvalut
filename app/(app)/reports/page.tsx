import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <>
      <PageHeader title="Reports" description="Run summaries and project trends." />
      <EmptyState icon={BarChart3} title="Coming in Phase 5" description="This screen is on the build plan and isn't available yet." />
    </>
  );
}
