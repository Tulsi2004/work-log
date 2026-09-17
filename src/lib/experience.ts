import { addMonths, differenceInDays, differenceInMonths } from "date-fns";

interface Stint {
  since: Date | string | null;
  until: Date | string | null;
}

/** Whole months, plus the days left over that never added up to another month. */
export interface Span {
  months: number;
  days: number;
}

export function spanBetween(start: Date, end: Date): Span {
  const months = Math.max(0, differenceInMonths(end, start));
  return { months, days: Math.max(0, differenceInDays(end, addMonths(start, months))) };
}

/** How long a stint ran, in milliseconds — only good for comparing two of them. */
export function stintLength(stint: Stint): number {
  if (!stint.since) return 0;
  const start = new Date(stint.since);
  const end = stint.until ? new Date(stint.until) : new Date();
  return Math.max(0, end.getTime() - start.getTime());
}

/**
 * Total time worked across every stint. Overlapping stints (two jobs at once)
 * are merged so the same calendar time is only counted once.
 *
 * Stints with gaps between them have no single exact answer in months and days,
 * so the merged time is laid end to end from the first start date — which is
 * how "I have N years of experience" is meant anyway.
 */
export function totalExperience(stints: Stint[]): Span {
  const now = new Date();
  const ranges = stints
    .filter((s) => Boolean(s.since))
    .map((s) => ({ start: new Date(s.since!), end: s.until ? new Date(s.until) : now }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (!ranges.length) return { months: 0, days: 0 };

  let elapsed = 0;
  let current: { start: Date; end: Date } | undefined;

  for (const range of ranges) {
    if (current && range.start <= current.end) {
      if (range.end > current.end) current.end = range.end;
      continue;
    }
    if (current) elapsed += current.end.getTime() - current.start.getTime();
    current = { ...range };
  }
  if (current) elapsed += current.end.getTime() - current.start.getTime();

  const start = ranges[0].start;
  return spanBetween(start, new Date(start.getTime() + elapsed));
}
