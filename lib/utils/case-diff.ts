import { CASE_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/constants/testing";
import type { CaseSnapshot } from "@/lib/validations/case";

export type CaseChange = { field: string; before: string; after: string };

/** Lists what changed between two versions. `plain` turns stored rich text into readable text. */
export function diffSnapshots(previous: CaseSnapshot, next: CaseSnapshot, plain: (html: string) => string): CaseChange[] {
  const changes: CaseChange[] = [];
  const compare = (field: string, before: string, after: string) => {
    if (before !== after) changes.push({ field, before, after });
  };

  compare("Title", previous.title, next.title);
  compare("Section", previous.section, next.section);
  compare("Priority", PRIORITY_LABELS[previous.priority], PRIORITY_LABELS[next.priority]);
  compare("Type", CASE_TYPE_LABELS[previous.type], CASE_TYPE_LABELS[next.type]);
  compare("Estimate", previous.estimate === null ? "" : `${previous.estimate} min`, next.estimate === null ? "" : `${next.estimate} min`);
  compare("References", previous.references ?? "", next.references ?? "");
  compare("Tags", previous.tags.join(", "), next.tags.join(", "));
  compare("Preconditions", plain(previous.preconditions ?? ""), plain(next.preconditions ?? ""));

  const stepText = (step?: { action: string; expectedResult: string }) =>
    step ? `${step.action}${step.expectedResult ? ` → ${step.expectedResult}` : ""}` : "";
  const longest = Math.max(previous.steps.length, next.steps.length);
  for (let index = 0; index < longest; index++) {
    compare(`Step ${index + 1}`, stepText(previous.steps[index]), stepText(next.steps[index]));
  }
  return changes;
}
