import { HOUR_HEIGHT } from "@/lib/calendar/dates";

export const DRAG_THRESHOLD = 4;

type DragHandlers = {
  /** Movement passed the threshold: this is a drag, not a click. */
  onStart?: (e: PointerEvent) => void;
  /** Called at most once per animation frame. */
  onMove?: (e: PointerEvent) => void;
  onEnd?: (e: PointerEvent) => void;
  /** Released without moving: a click. */
  onClick?: (e: PointerEvent) => void;
  onCancel?: () => void;
};

/**
 * Tracks a pointer from pointerdown to release with window listeners. No React
 * state: callers move a ghost element with transforms and commit on onEnd.
 */
export function startPointerDrag(down: { clientX: number; clientY: number }, h: DragHandlers) {
  let dragging = false;
  let frame = 0;
  let last: PointerEvent | null = null;

  const move = (e: PointerEvent) => {
    if (!dragging && Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < DRAG_THRESHOLD) return;
    if (!dragging) {
      dragging = true;
      document.body.style.userSelect = "none";
      h.onStart?.(e);
    }
    last = e;
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      if (last) h.onMove?.(last);
    });
  };
  const cleanup = () => {
    cancelAnimationFrame(frame);
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    window.removeEventListener("keydown", key);
  };
  const up = (e: PointerEvent) => {
    cleanup();
    if (!dragging) return h.onClick?.(e);
    h.onMove?.(e);
    h.onEnd?.(e);
  };
  const cancel = () => {
    cleanup();
    if (dragging) h.onCancel?.();
  };
  const key = (e: KeyboardEvent) => e.key === "Escape" && cancel();

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("keydown", key);
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Column index and minute-of-day under the pointer in a time grid whose columns fill `el`. */
export function timeGridPoint(e: { clientX: number; clientY: number }, el: HTMLElement, columns: number) {
  const r = el.getBoundingClientRect();
  return {
    col: clamp(Math.floor(((e.clientX - r.left) / r.width) * columns), 0, columns - 1),
    min: clamp(((e.clientY - r.top) / HOUR_HEIGHT) * 60, 0, 24 * 60),
  };
}

/** Cell index under the pointer in a rows × columns grid filling `el` (month view, all-day row). */
export function cellPoint(e: { clientX: number; clientY: number }, el: HTMLElement, rows: number, columns: number) {
  const r = el.getBoundingClientRect();
  const col = clamp(Math.floor(((e.clientX - r.left) / r.width) * columns), 0, columns - 1);
  const row = clamp(Math.floor(((e.clientY - r.top) / r.height) * rows), 0, rows - 1);
  return { row, col, index: row * columns + col };
}
