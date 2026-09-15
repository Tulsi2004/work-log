// A card strip the user has arranged for themselves: which cards show, and in
// what order. Both the work-log dashboard and the money page store their own
// list under their own `UserPreference` key, and read it back through here.

export interface CardOption {
  label: string;
  /** Optional qualifier shown beside the label while choosing cards. */
  badge?: string;
}

/**
 * Drops ids that no longer exist and de-duplicates, so a stale preference still
 * renders. An empty array is a real choice — every card hidden — and is kept as
 * it is; only "nothing stored at all" falls back to the defaults.
 */
export function readCards<T extends string>(
  value: unknown,
  known: readonly T[],
  defaults: T[]
): T[] {
  if (!Array.isArray(value)) return defaults;

  const allowed = new Set<string>(known);
  const cards: T[] = [];
  for (const id of value) {
    if (typeof id !== "string" || !allowed.has(id)) continue;
    if (cards.includes(id as T)) continue;
    cards.push(id as T);
  }
  return cards;
}
