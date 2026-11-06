"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/form-controls";
import type { CaseType, Priority } from "@/generated/prisma/enums";
import { CASE_TYPES, PRIORITIES } from "@/lib/constants/testing";
import { parseStepsCell } from "@/lib/utils/csv";
import { importRowSchema, type ImportRow } from "@/lib/validations/case";
import { importCases } from "@/server/actions/cases";

const MAX_ROWS = 5000;
const BATCH_SIZE = 200;

const FIELDS = [
  { id: "title", label: "Title", required: true, aliases: ["title", "name", "test case", "summary"] },
  { id: "section", label: "Section", aliases: ["section", "folder", "suite", "path"] },
  { id: "priority", label: "Priority", aliases: ["priority"] },
  { id: "type", label: "Type", aliases: ["type", "case type"] },
  { id: "estimate", label: "Estimate", aliases: ["estimate", "minutes", "duration"] },
  { id: "references", label: "References", aliases: ["references", "reference", "refs", "jira"] },
  { id: "tags", label: "Tags", aliases: ["tags", "labels"] },
  { id: "preconditions", label: "Preconditions", aliases: ["preconditions", "precondition", "prerequisites"] },
  { id: "steps", label: "Steps", aliases: ["steps", "step"] },
] as const;

type FieldId = (typeof FIELDS)[number]["id"];
type Mapping = Record<FieldId, string>;
type CsvRow = Record<string, string>;

function guessMapping(headers: string[]) {
  const mapping = {} as Mapping;
  for (const field of FIELDS) {
    mapping[field.id] = headers.find((header) => (field.aliases as readonly string[]).includes(header.trim().toLowerCase())) ?? "";
  }
  return mapping;
}

function matchEnum<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T) {
  const normalized = (value ?? "").trim().toUpperCase();
  return allowed.find((option) => option === normalized) ?? fallback;
}

function toImportRow(row: CsvRow, mapping: Mapping): ImportRow | null {
  const cell = (id: FieldId) => (mapping[id] ? (row[mapping[id]] ?? "").trim().replace(/^'(?=[=+\-@])/, "") : "");
  const estimate = Number.parseInt(cell("estimate"), 10);
  const parsed = importRowSchema.safeParse({
    title: cell("title"),
    section: cell("section"),
    priority: matchEnum<Priority>(cell("priority"), PRIORITIES, "MEDIUM"),
    type: matchEnum<CaseType>(cell("type"), CASE_TYPES, "FUNCTIONAL"),
    estimate: Number.isFinite(estimate) && estimate >= 0 ? estimate : null,
    references: cell("references"),
    tags: cell("tags").split(/[;,]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 20),
    preconditions: cell("preconditions"),
    steps: parseStepsCell(cell("steps")),
  });
  return parsed.success ? parsed.data : null;
}

export function ImportDialog({ projectId, onClose, onImported }: { projectId: string; onClose: () => void; onImported: () => void }) {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: ({ data, meta }) => {
        const fields = meta.fields ?? [];
        if (fields.length === 0 || data.length === 0) {
          toast.error("That file has no rows to import.");
          return;
        }
        if (data.length > MAX_ROWS) {
          toast.error(`That file has ${data.length} rows. Import at most ${MAX_ROWS} at a time.`);
          return;
        }
        setFileName(file.name);
        setHeaders(fields);
        setRows(data);
        setMapping(guessMapping(fields));
      },
      error: () => toast.error("Couldn't read that file. Is it a CSV?"),
    });
  }

  const converted = useMemo(() => (mapping ? rows.map((row) => toImportRow(row, mapping)) : []), [rows, mapping]);
  const valid = useMemo(() => converted.filter((row): row is ImportRow => row !== null), [converted]);
  const skipped = converted.length - valid.length;

  async function runImport() {
    setProgress(0);
    let imported = 0;
    for (let start = 0; start < valid.length; start += BATCH_SIZE) {
      const result = await importCases(projectId, valid.slice(start, start + BATCH_SIZE));
      if (!result.ok) {
        toast.error(imported ? `${result.error} ${imported} case(s) were imported before this.` : result.error);
        setProgress(null);
        if (imported) onImported();
        return;
      }
      imported += result.data.imported;
      setProgress(imported / valid.length);
    }
    toast.success(`Imported ${imported} case(s)${skipped ? `, skipped ${skipped} invalid row(s)` : ""}`);
    onImported();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && progress === null && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import cases from CSV</DialogTitle>
          <DialogDescription>
            {mapping
              ? `${fileName}: ${rows.length} row(s). Match each field to a column, then check the preview.`
              : "New cases are created for every row. Steps go one per line, written as action => expected result."}
          </DialogDescription>
        </DialogHeader>

        {!mapping ? (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center transition-colors hover:bg-accent/50 focus-within:ring-[3px] focus-within:ring-ring/40">
            <FileUp className="size-7 text-primary" aria-hidden />
            <span className="text-sm font-medium">Choose a CSV file</span>
            <span className="text-xs text-muted-foreground">Up to {MAX_ROWS} rows</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => onFile(event.target.files?.[0])} />
          </label>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {FIELDS.map((field) => (
                <div key={field.id}>
                  <label htmlFor={`map-${field.id}`} className="mb-1 block text-xs font-medium">
                    {field.label}
                    {"required" in field && <span className="text-destructive"> *</span>}
                  </label>
                  <NativeSelect
                    id={`map-${field.id}`}
                    className="h-9"
                    value={mapping[field.id]}
                    onChange={(event) => setMapping({ ...mapping, [field.id]: event.target.value })}
                  >
                    <option value="">Don&apos;t import</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ))}
            </div>

            <div>
              <h3 className="mb-1.5 text-sm font-semibold">Preview</h3>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      {["Title", "Section", "Priority", "Type", "Tags", "Steps"].map((heading) => (
                        <th key={heading} scope="col" className="px-2.5 py-1.5 font-medium">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {converted.slice(0, 5).map((row, index) => (
                      <tr key={index} className={row ? "" : "bg-status-failed/10"}>
                        {row ? (
                          <>
                            <td className="max-w-64 truncate px-2.5 py-1.5">{row.title}</td>
                            <td className="max-w-40 truncate px-2.5 py-1.5">{row.section || "Imported"}</td>
                            <td className="px-2.5 py-1.5">{row.priority}</td>
                            <td className="px-2.5 py-1.5">{row.type}</td>
                            <td className="max-w-32 truncate px-2.5 py-1.5">{row.tags.join(", ")}</td>
                            <td className="px-2.5 py-1.5 font-mono tabular-nums">{row.steps.length}</td>
                          </>
                        ) : (
                          <td colSpan={6} className="px-2.5 py-1.5 text-status-failed">
                            Row {index + 1} will be skipped because it has no valid title.
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                {valid.length} case(s) ready{skipped ? `, ${skipped} row(s) will be skipped` : ""}.
              </p>
            </div>

            {progress !== null && (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Import progress" aria-valuenow={Math.round(progress * 100)}>
                <div className="h-full origin-left bg-primary transition-transform duration-200" style={{ transform: `scaleX(${progress})` }} />
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={progress !== null}>
            Cancel
          </Button>
          {mapping && (
            <Button onClick={() => void runImport()} disabled={valid.length === 0 || progress !== null}>
              {progress !== null ? "Importing…" : `Import ${valid.length} case(s)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
