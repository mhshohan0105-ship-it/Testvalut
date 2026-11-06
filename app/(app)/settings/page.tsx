import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <>
      <PageHeader title="Settings" description="Workspace preferences and storage." />
      <EmptyState icon={Settings} title="Coming in a later phase" description="This screen is on the build plan and isn't available yet." />
    </>
  );
}
