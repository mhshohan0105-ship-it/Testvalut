const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 30;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Reads a from and to day from a URL. Missing or invalid values fall back to the last 30 days. */
export function parseDateRange(from: string | null | undefined, to: string | null | undefined) {
  const today = new Date().toISOString().slice(0, 10);
  const toDay = to && ISO_DAY.test(to) && !Number.isNaN(Date.parse(to)) ? to : today;
  const fallbackFrom = new Date(Date.parse(`${toDay}T00:00:00Z`) - (DEFAULT_DAYS - 1) * DAY_MS).toISOString().slice(0, 10);
  const fromDay = from && ISO_DAY.test(from) && !Number.isNaN(Date.parse(from)) && from <= toDay ? from : fallbackFrom;
  return {
    fromDay,
    toDay,
    start: new Date(`${fromDay}T00:00:00.000Z`),
    /** Exclusive, so the whole of the last day is included. */
    end: new Date(Date.parse(`${toDay}T00:00:00Z`) + DAY_MS),
  };
}

export type DateRange = ReturnType<typeof parseDateRange>;
