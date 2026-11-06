import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";
import { MobileNav } from "./mobile-nav";
import { ProjectSwitcher } from "./project-switcher";
import { SearchButton } from "./search-button";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function TopBar({
  user,
  projects,
  activeProjectId,
}: {
  user: CurrentUser;
  projects: { id: string; name: string; key: string; color: string }[];
  activeProjectId: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-(--glass-border) bg-(--topbar-surface) px-3 backdrop-blur-xl md:gap-3 md:px-8">
      <MobileNav />
      <div className="flex min-w-0 flex-1">
        <ProjectSwitcher projects={projects} activeId={activeProjectId} />
      </div>
      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        <SearchButton />
        <ThemeToggle />
        <UserMenu name={user.name} email={user.email} roleLabel={ROLE_LABELS[user.role]} />
      </div>
    </header>
  );
}
