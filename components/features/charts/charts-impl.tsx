"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
const GRID = { stroke: "var(--border)", vertical: false } as const;

type TooltipEntry = { name?: string | number; value?: string | number; color?: string; payload?: { fill?: string } };

function GlassTooltip({ active, payload, label, unit }: { active?: boolean; payload?: readonly TooltipEntry[]; label?: string | number; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-overlay rounded-lg px-2.5 py-1.5 text-xs">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((entry) => (
        <p key={String(entry.name)} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color ?? entry.payload?.fill }} aria-hidden />
          {entry.name}
          <span className="ml-auto pl-3 font-mono text-foreground tabular-nums">
            {entry.value}
            {unit}
          </span>
        </p>
      ))}
    </div>
  );
}

export function DonutImpl({ data, centerLabel, centerValue }: { data: { name: string; value: number; color: string }[]; centerLabel: string; centerValue: string }) {
  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="92%" startAngle={90} endAngle={-270} paddingAngle={1.5} cornerRadius={4} stroke="none" isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={(props) => <GlassTooltip active={props.active} payload={props.payload as readonly TooltipEntry[]} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold tabular-nums">{centerValue}</span>
        <span className="text-xs text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  );
}

export function StackedAreaImpl({ data, series }: { data: Record<string, string | number>[]; series: { key: string; name: string; color: string }[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -24 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...AXIS} minTickGap={24} />
          <YAxis {...AXIS} allowDecimals={false} />
          <Tooltip content={(props) => <GlassTooltip active={props.active} payload={props.payload as readonly TooltipEntry[]} label={props.label as string} />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
          {series.map((entry) => (
            <Area key={entry.key} type="monotone" dataKey={entry.key} name={entry.name} stackId="results" stroke={entry.color} strokeWidth={2} fill={entry.color} fillOpacity={0.22} isAnimationActive={false} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLineImpl({ data }: { data: { label: string; passRate: number | null }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...AXIS} minTickGap={32} />
          <YAxis {...AXIS} domain={[0, 100]} unit="%" />
          <Tooltip content={(props) => <GlassTooltip active={props.active} payload={props.payload as readonly TooltipEntry[]} label={props.label as string} unit="%" />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
          <Line type="monotone" dataKey="passRate" name="Pass rate" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsImpl({ data, name }: { data: { label: string; value: number }[]; name: string }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} allowDecimals={false} />
          <Tooltip content={(props) => <GlassTooltip active={props.active} payload={props.payload as readonly TooltipEntry[]} label={props.label as string} />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="value" name={name} fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
