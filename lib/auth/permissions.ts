import type { Role } from "@/generated/prisma/enums";

export type Permission =
  | "team:manage"
  | "project:manage"
  | "case:manage"
  | "run:manage"
  | "milestone:manage"
  | "result:create"
  | "comment:create"
  | "attachment:upload";

const ALLOWED_ROLES: Record<Permission, readonly Role[]> = {
  "team:manage": ["ADMIN"],
  "project:manage": ["ADMIN", "LEAD"],
  "case:manage": ["ADMIN", "LEAD"],
  "run:manage": ["ADMIN", "LEAD"],
  "milestone:manage": ["ADMIN", "LEAD"],
  "result:create": ["ADMIN", "LEAD", "TESTER"],
  "comment:create": ["ADMIN", "LEAD", "TESTER"],
  "attachment:upload": ["ADMIN", "LEAD", "TESTER"],
};

export function hasPermission(role: Role, permission: Permission) {
  return ALLOWED_ROLES[permission].includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  LEAD: "Lead",
  TESTER: "Tester",
  VIEWER: "Viewer",
};
