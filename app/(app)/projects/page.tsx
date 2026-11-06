import type { Metadata } from "next";
import Link from "next/link";
import { Archive, FolderKanban, ListChecks, Plus, Users } from "lucide-react";
import { PassRateRing } from "@/components/features/projects/pass-rate-ring";
import { ProjectFormDialog } from "@/components/features/projects/project-form-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TiltCard } from "@/components/ui/tilt-card";
import { hasPermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getProjectCards } from "@/server/queries/projects";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const showArchived = (await searchParams).archived === "1";
  const user = await requireUser();
  const projects = await getProjectCards(user, showArchived);
  const canCreate = hasPermission(user.role, "project:manage");
  const newProject = (
    <ProjectFormDialog
      trigger={
        <Button>
          <Plus /> New project
        </Button>
      }
    />
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={showArchived ? "Archived projects" : "Projects"} description="Every project your team is testing." />
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={showArchived ? "/projects" : "/projects?archived=1"}>
              <Archive /> {showArchived ? "Active projects" : "Archived"}
            </Link>
          </Button>
          {canCreate && newProject}
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={showArchived ? "Nothing archived" : "No projects yet"}
          description={
            showArchived
              ? "Archived projects show up here."
              : canCreate
                ? "Create your first project to start writing test cases."
                : "Ask an admin to add you to a project."
          }
          action={!showArchived && canCreate ? newProject : undefined}
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => (
            <div key={project.id} className="page-enter" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
              <TiltCard>
                <Link href={`/projects/${project.id}`} className="relative z-10 block rounded-2xl p-5">
                  <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: project.color }} aria-hidden />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold text-white" style={{ backgroundColor: project.color }}>
                        {project.key}
                      </span>
                      <h2 className="mt-2.5 truncate text-lg font-semibold tracking-tight">{project.name}</h2>
                    </div>
                    <PassRateRing value={project.passRate} color={project.color} />
                  </div>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{project.description ?? "No description"}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <ListChecks className="size-3.5" aria-hidden />
                      <span className="font-mono tabular-nums">{project._count.cases}</span> cases
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3.5" aria-hidden />
                      <span className="font-mono tabular-nums">{project._count.members}</span> members
                    </span>
                  </div>
                </Link>
              </TiltCard>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
