import type { Metadata } from "next";
import { Flag } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Milestones" };

export default function Page() {
  return (
    <>
      <PageHeader title="Milestones" description="Track progress toward each release." />
      <EmptyState icon={Flag} title="Coming in Phase 5" description="This screen is on the build plan and isn't available yet." />
    </>
  );
}
