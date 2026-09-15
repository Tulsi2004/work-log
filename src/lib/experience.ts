import { differenceInMonths } from "date-fns";

interface Stint {
  since: Date | string | null;
  until: Date | string | null;
}

/**
 * Total months worked across every stint. Overlapping stints (two jobs at once)
 * are merged so the same calendar time is only counted once.
 */
export function totalExperienceMonths(stints: Stint[]): number {
  const now = new Date();
  const ranges = stints
    .filter((s) => Boolean(s.since))
    .map((s) => ({ start: new Date(s.since!), end: s.until ? new Date(s.until) : now }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let months = 0;
  let current: { start: Date; end: Date } | undefined;

  for (const range of ranges) {
    if (current && range.start <= current.end) {
      if (range.end > current.end) current.end = range.end;
      continue;
    }
    if (current) months += differenceInMonths(current.end, current.start);
    current = { ...range };
  }
  if (current) months += differenceInMonths(current.end, current.start);

  return months;
}
