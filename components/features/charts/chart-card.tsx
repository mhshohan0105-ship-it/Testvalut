import { GlassCard } from "@/components/ui/glass-card";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

export type LegendItem = { label: string; color: string; value?: string | number };

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
          {item.label}
          {item.value !== undefined && <span className="font-mono text-foreground tabular-nums">{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}

/** A titled chart with its legend and a table view, so nothing depends on seeing color or hovering. */
export function ChartCard({
  title,
  legend,
  table,
  className,
  children,
}: {
  title: string;
  legend?: LegendItem[];
  table?: { headers: string[]; rows: (string | number)[][] };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal className={className}>
      <GlassCard className="flex h-full flex-col gap-3 p-5 print:break-inside-avoid">
        <h2 className="font-semibold tracking-tight">{title}</h2>
        {legend && <ChartLegend items={legend} />}
        <div className="min-w-0 flex-1">{children}</div>
        {table && (
          <details className="text-xs text-muted-foreground print:hidden">
            <summary className="cursor-pointer rounded hover:text-foreground">View as table</summary>
            <div className="mt-2 max-h-56 overflow-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    {table.headers.map((header) => (
                      <th key={header} scope="col" className="py-1 pr-3 font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={cn("divide-y divide-border text-foreground")}>
                  {table.rows.map((row, index) => (
                    <tr key={index}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="py-1 pr-3 tabular-nums">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </GlassCard>
    </Reveal>
  );
}
