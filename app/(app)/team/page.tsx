import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return (
    <>
      <PageHeader title="Team" description="Manage people and roles." />
      <EmptyState icon={Users} title="Coming in a later phase" description="This screen is on the build plan and isn't available yet." />
    </>
  );
}
