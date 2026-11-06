import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return (
    <>
      <PageHeader title="Projects" description="Every project your team is testing." />
      <EmptyState icon={FolderKanban} title="Coming in Phase 2" description="This screen is on the build plan and isn't available yet." />
    </>
  );
}
