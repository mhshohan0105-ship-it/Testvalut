/** Quotes a cell, and neutralizes values a spreadsheet would otherwise run as a formula. */
export function csvCell(value: string | number | null | undefined) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(cells: (string | number | null | undefined)[]) {
  return cells.map(csvCell).join(",");
}

const STEP_SEPARATOR = " => ";

export function formatStepsCell(steps: { action: string; expectedResult: string }[]) {
  return steps
    .map((step, index) => `${index + 1}. ${step.action.replace(/\s*\n\s*/g, " ")}${step.expectedResult ? `${STEP_SEPARATOR}${step.expectedResult.replace(/\s*\n\s*/g, " ")}` : ""}`)
    .join("\n");
}

/** Reads one step per line, as `action => expected` or `action | expected`, with optional numbering. */
export function parseStepsCell(cell: string) {
  return cell
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^'?\d+[.)]\s*/, ""))
    .filter(Boolean)
    .map((line) => {
      const separator = line.includes(STEP_SEPARATOR) ? STEP_SEPARATOR : " | ";
      const at = line.indexOf(separator);
      if (at === -1) return { action: line, expectedResult: "" };
      return { action: line.slice(0, at).trim(), expectedResult: line.slice(at + separator.length).trim() };
    })
    .filter((step) => step.action);
}
