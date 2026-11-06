import {
  BarChart3,
  Bug,
  Flag,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  PlayCircle,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/cases", label: "Test Cases", icon: ListChecks },
  { href: "/runs", label: "Test Runs", icon: PlayCircle },
  { href: "/bugs", label: "Bugs", icon: Bug },
  { href: "/milestones", label: "Milestones", icon: Flag },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];
