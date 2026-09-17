"use client";

import { Sparkles, type LucideIcon } from "lucide-react";
import { usePreference } from "@/hooks/use-preference";
import { useCustomCards } from "@/hooks/use-custom-cards";
import { readCards, type CardOption } from "@/lib/card-preferences";
import { customCardId, parseCustomCardId, type CustomCardValue } from "@/lib/custom-cards";

/** What a card the user built is marked with, wherever cards are listed. */
export const CUSTOM_CARD_BADGE = "Yours";
export const CUSTOM_CARD_ICON: LucideIcon = Sparkles;

/**
 * One card strip's state. A card the user built joins the fixed catalogue under
 * a `custom:` id, so the same "which cards, in what order" preference carries
 * both kinds and the strips need to know nothing about where a number came from.
 */
export function useCardStrip(
  preferenceKey: string,
  catalogue: readonly string[],
  meta: Record<string, CardOption>,
  defaults: string[]
) {
  const { data: preference } = usePreference(preferenceKey);
  const { data: customCards = [] } = useCustomCards();

  const fullCatalogue = [...catalogue, ...customCards.map((card) => customCardId(card.id))];
  const fullMeta: Record<string, CardOption> = { ...meta };
  const byCardId = new Map<string, CustomCardValue>();
  for (const card of customCards) {
    fullMeta[customCardId(card.id)] = { label: card.title, badge: CUSTOM_CARD_BADGE };
    byCardId.set(customCardId(card.id), card);
  }

  return {
    cards: readCards(preference, fullCatalogue, defaults),
    catalogue: fullCatalogue,
    meta: fullMeta,
    customCards,
    /** The built card behind a `custom:` id, or undefined for a built-in one. */
    customCard: (id: string) => byCardId.get(id),
    isCustom: (id: string) => parseCustomCardId(id) !== undefined,
  };
}
