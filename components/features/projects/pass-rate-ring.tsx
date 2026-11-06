const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function PassRateRing({ value, color }: { value: number | null; color: string }) {
  const percent = value ?? 0;
  return (
    <div className="relative size-14 shrink-0" role="img" aria-label={value === null ? "No results yet" : `Pass rate ${value}%`}>
      <svg viewBox="0 0 48 48" className="size-full -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth="5" />
        {value !== null && (
          <circle
            cx="24"
            cy="24"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold tabular-nums">
        {value === null ? "–" : `${value}%`}
      </span>
    </div>
  );
}
