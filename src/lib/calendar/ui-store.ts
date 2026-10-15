import { create } from "zustand";
import type { ViewKey } from "./dates";
import type { CalItem } from "@/hooks/calendar/use-calendar-items";
import type { Scope } from "./validators";

/** Something a popover can anchor to: a live element (followed on scroll) or a fixed rect. */
export type Anchor = { getBoundingClientRect: () => DOMRect };
export const anchorFor = (el: Element | null): Anchor => {
  const rect = el?.getBoundingClientRect() ?? new DOMRect(window.innerWidth / 2, window.innerHeight / 3, 0, 0);
  return { getBoundingClientRect: () => (el?.isConnected ? el.getBoundingClientRect() : rect) };
};
/** Follows the draft block rendered in the grid ([data-draft]); falls back to `el`. */
export const draftAnchor = (el: Element | null): Anchor => {
  const fallback = anchorFor(el);
  return {
    getBoundingClientRect: () =>
      document.querySelector("[data-draft]")?.getBoundingClientRect() ?? fallback.getBoundingClientRect(),
  };
};

/** Draft event shown in the grid while Quick Create is open. Dates are local copies; all-day end is exclusive. */
export type Draft = { start: Date; end: Date; isAllDay: boolean };

export type PopoverState =
  | { kind: "create"; anchor: Anchor }
  | { kind: "detail"; anchor: Anchor; item: CalItem }
  | { kind: "day"; anchor: Anchor; date: Date; items: CalItem[] }
  | null;

type ScopePrompt = { kind: "edit" | "delete"; allowThis: boolean; resolve: (s: Scope | null) => void } | null;
type DialogKind = "shortcuts" | "goto" | "newCalendar" | null;

type UIState = {
  /** Sidebar on wide screens (>= 1024px); below that it's an overlay drawer. */
  sidebarOpen: boolean;
  drawerOpen: boolean;
  searchOpen: boolean;
  /** Last calendar route, used when leaving and coming back from editor/search/settings. */
  lastView: ViewKey | null;
  lastDate: string | null;
  popover: PopoverState;
  draft: Draft | null;
  draftTitle: string;
  dialog: DialogKind;
  scopePrompt: ScopePrompt;
  set: (patch: Partial<Omit<UIState, "set">>) => void;
  closePopover: () => void;
};

export const useUI = create<UIState>((set) => ({
  sidebarOpen: true,
  drawerOpen: false,
  searchOpen: false,
  lastView: null,
  lastDate: null,
  popover: null,
  draft: null,
  draftTitle: "",
  dialog: null,
  scopePrompt: null,
  set: (patch) => set(patch),
  closePopover: () => set({ popover: null, draft: null, draftTitle: "" }),
}));

export const openDetail = (item: CalItem, el: Element) =>
  useUI.getState().set({ popover: { kind: "detail", anchor: anchorFor(el), item } });

/** Shows a draft in the grid and opens Quick Create on it. */
export const openDraft = (draft: Draft, el: Element) =>
  useUI.getState().set({ draft, draftTitle: "", popover: { kind: "create", anchor: draftAnchor(el) } });

/** Opens the "Edit/Delete recurring event" dialog and resolves with the chosen scope. */
export const askScope = (kind: "edit" | "delete", allowThis = true) =>
  new Promise<Scope | null>((resolve) => useUI.getState().set({ scopePrompt: { kind, allowThis, resolve } }));
