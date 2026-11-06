import { useId } from "react";

/** The circuit V. Each instance gets its own gradient id, because one inside a hidden sidebar would blank the others. */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  const gradientId = `logo-${useId().replace(/\W/g, "")}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="4" y1="4" x2="60" y2="60">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${gradientId})`} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 14v8l24 34 24-34v-8" />
        <path d="M21 14v5l11 17 11-17v-5" />
      </g>
      <circle cx="8" cy="10" r="4.5" fill="#22d3ee" />
      <circle cx="56" cy="10" r="4.5" fill="#22d3ee" />
      <circle cx="21" cy="10" r="4" fill="#8b5cf6" />
      <circle cx="43" cy="10" r="4" fill="#8b5cf6" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-brand font-bold ${className}`}>
      Test<span className="wordmark-accent">Vault</span>
    </span>
  );
}
