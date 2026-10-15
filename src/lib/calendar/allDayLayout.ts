import { addDaysToKey } from "./dates";

export type SpanItem = { startDate: string; endDate: string }; // date keys, end exclusive

export type SpanPlacement<T> = {
  occurrence: T;
  lane: number;
  startCol: number;
  span: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

/**
 * Packs multi-day bars into lanes for one row of visible days (`days` = date keys of
 * the visible columns, which may skip hidden weekends). Input order breaks ties, so
 * pass items pre-sorted by priority (all-day first, then by start time).
 */
export function layoutAllDay<T extends SpanItem>(items: T[], days: string[]): SpanPlacement<T>[] {
  const spans: Omit<SpanPlacement<T>, "lane">[] = [];
  for (const it of items) {
    const startCol = days.findIndex((d) => d >= it.startDate);
    const lastCol = days.findLastIndex((d) => d < it.endDate);
    if (startCol === -1 || lastCol < startCol) continue;
    spans.push({
      occurrence: it,
      startCol,
      span: lastCol - startCol + 1,
      continuesBefore: it.startDate < days[startCol],
      continuesAfter: it.endDate > addDaysToKey(days[lastCol], 1),
    });
  }
  spans.sort((a, b) => a.startCol - b.startCol || b.span - a.span);

  const laneFreeFrom: number[] = [];
  return spans.map((s) => {
    let lane = laneFreeFrom.findIndex((free) => free <= s.startCol);
    if (lane === -1) lane = laneFreeFrom.length;
    laneFreeFrom[lane] = s.startCol + s.span;
    return { ...s, lane };
  });
}
