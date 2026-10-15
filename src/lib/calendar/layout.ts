import { HOUR_HEIGHT } from "./dates";

/** Events starting this many minutes after every event they overlap are stacked on top, indented. */
export const STACK_THRESHOLD_MIN = 45;
/** Indent (percent of the column) for a stacked event. */
export const STACK_INDENT = 10;
export const MIN_EVENT_HEIGHT = 20;

export type LayoutItem = { id: string; startMin: number; endMin: number };
export type LayoutBox = {
  id: string;
  top: number; // px
  height: number; // px
  left: number; // %
  width: number; // %
  zIndex: number;
};

type Root = LayoutItem & { col: number; extentEnd: number; children: LayoutItem[] };

/**
 * Lays out the timed events of ONE day column (already clipped to that day):
 * clusters of overlapping events, greedy columns, rightward expansion into free
 * columns, and Google-style stacking for late-starting overlaps.
 */
export function layoutDay(items: LayoutItem[], hourHeight = HOUR_HEIGHT): LayoutBox[] {
  const sorted = [...items].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - b.startMin - (a.endMin - a.startMin),
  );
  const out: LayoutBox[] = [];
  place(sorted, 0, 100, 1, hourHeight, out);
  return out;
}

function place(items: LayoutItem[], left: number, width: number, z: number, hourHeight: number, out: LayoutBox[]) {
  let cluster: Root[] = [];
  let columns: Root[][] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const n = columns.length;
    for (const r of cluster) {
      // Expand rightward while the next column has nothing overlapping this event's extent.
      let span = 1;
      while (
        r.col + span < n &&
        !columns[r.col + span].some((o) => o.startMin < r.extentEnd && o.extentEnd > r.startMin)
      )
        span++;
      const box = {
        id: r.id,
        top: (r.startMin / 60) * hourHeight,
        height: Math.max(((r.endMin - r.startMin) / 60) * hourHeight, MIN_EVENT_HEIGHT),
        left: left + (r.col * width) / n,
        width: (span * width) / n,
        zIndex: z,
      };
      out.push(box);
      if (r.children.length) {
        const indent = Math.min(STACK_INDENT, box.width / 4);
        place(r.children, box.left + indent, box.width - indent, z + 1, hourHeight, out);
      }
    }
    cluster = [];
    columns = [];
  };

  for (const it of items) {
    if (it.startMin >= clusterEnd) flush();
    const freeCol = columns.findIndex((col) => col[col.length - 1].extentEnd <= it.startMin);
    const overlapping = cluster.filter((r) => r.extentEnd > it.startMin);
    if (freeCol === -1 && overlapping.length && overlapping.every((r) => it.startMin - r.startMin >= STACK_THRESHOLD_MIN)) {
      // Stack on the most recently started overlapping event.
      const parent = overlapping.reduce((a, b) => (b.startMin >= a.startMin ? b : a));
      parent.children.push(it);
      parent.extentEnd = Math.max(parent.extentEnd, it.endMin);
    } else {
      const col = freeCol === -1 ? columns.length : freeCol;
      const root: Root = { ...it, col, extentEnd: it.endMin, children: [] };
      (columns[col] ??= []).push(root);
      cluster.push(root);
    }
    clusterEnd = Math.max(clusterEnd, it.endMin);
  }
  flush();
}
