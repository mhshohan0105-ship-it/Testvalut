// A fixed time zone keeps server-rendered and hydrated output identical.
const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const DATE_TIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatDate(value: Date | string) {
  return DATE.format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return `${DATE_TIME.format(new Date(value))} UTC`;
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function caseLabel(caseNumber: number) {
  return `C${caseNumber}`;
}
