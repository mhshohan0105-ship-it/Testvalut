import type { CaseType, Priority, Role, TestStatus } from "@/generated/prisma/enums";

export const PRIORITIES: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
export const CASE_TYPES: CaseType[] = ["FUNCTIONAL", "REGRESSION", "SMOKE", "UI", "API", "PERFORMANCE", "SECURITY", "OTHER"];
export const MEMBER_ROLES: Role[] = ["LEAD", "TESTER", "VIEWER"];

export const PRIORITY_LABELS: Record<Priority, string> = { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  FUNCTIONAL: "Functional",
  REGRESSION: "Regression",
  SMOKE: "Smoke",
  UI: "UI",
  API: "API",
  PERFORMANCE: "Performance",
  SECURITY: "Security",
  OTHER: "Other",
};

export const STATUS_LABELS: Record<TestStatus, string> = {
  PASSED: "Passed",
  FAILED: "Failed",
  BLOCKED: "Blocked",
  RETEST: "Retest",
  UNTESTED: "Untested",
  SKIPPED: "Skipped",
};

export const PROJECT_COLORS = ["#7C3AED", "#4F46E5", "#0EA5E9", "#14B8A6", "#10B981", "#F59E0B", "#F43F5E", "#EC4899"];
