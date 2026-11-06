import type { Metadata } from "next";
import { TeamPanel } from "@/components/features/team/team-panel";
import { PageHeader } from "@/components/layout/page-header";
import { hasPermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const user = await requireUser();
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, deactivatedAt: true },
    orderBy: [{ deactivatedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader title="Team" description="Manage people and roles." />
      <TeamPanel
        users={users.map(({ deactivatedAt, ...rest }) => ({ ...rest, deactivated: deactivatedAt !== null }))}
        currentUserId={user.id}
        canManage={hasPermission(user.role, "team:manage")}
      />
    </>
  );
}
