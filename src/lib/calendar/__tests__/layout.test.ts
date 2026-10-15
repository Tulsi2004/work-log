import { describe, expect, it } from "vitest";
import { layoutAllDay } from "../allDayLayout";
import { layoutDay, MIN_EVENT_HEIGHT, STACK_INDENT } from "../layout";

const ev = (id: string, start: string, end: string) => {
  const m = (s: string) => Number(s.split(":")[0]) * 60 + Number(s.split(":")[1]);
  return { id, startMin: m(start), endMin: m(end) };
};
const byId = (boxes: ReturnType<typeof layoutDay>) => Object.fromEntries(boxes.map((b) => [b.id, b]));

describe("layoutDay", () => {
  it("non-overlapping events are full width", () => {
    const b = byId(layoutDay([ev("a", "09:00", "10:00"), ev("b", "10:00", "11:00")]));
    expect(b.a).toMatchObject({ left: 0, width: 100, top: 9 * 48, height: 48 });
    expect(b.b).toMatchObject({ left: 0, width: 100 });
  });

  it("two overlapping events get two 50% columns", () => {
    const b = byId(layoutDay([ev("a", "09:00", "10:00"), ev("b", "09:30", "10:30")]));
    expect(b.a).toMatchObject({ left: 0, width: 50 });
    expect(b.b).toMatchObject({ left: 50, width: 50 });
  });

  it("A overlaps B, B overlaps C, A not C: C reuses column 0", () => {
    const b = byId(layoutDay([ev("a", "09:00", "10:00"), ev("b", "09:30", "10:30"), ev("c", "10:00", "11:00")]));
    expect(b.a).toMatchObject({ left: 0, width: 50 });
    expect(b.b).toMatchObject({ left: 50, width: 50 });
    expect(b.c).toMatchObject({ left: 0, width: 50 });
  });

  it("expands into free columns on the right", () => {
    // a | b | c, then d only collides with a, so it spans columns 1-2.
    const b = byId(
      layoutDay([
        ev("a", "09:00", "11:00"),
        ev("b", "09:10", "09:40"),
        ev("c", "09:20", "09:50"),
        ev("d", "10:00", "10:30"),
      ]),
    );
    expect(b.a.width).toBeCloseTo(100 / 3);
    expect(b.d.left).toBeCloseTo(100 / 3);
    expect(b.d.width).toBeCloseTo(200 / 3);
  });

  it("late-starting overlaps stack on top with an indent", () => {
    const b = byId(layoutDay([ev("long", "09:00", "12:00"), ev("late", "10:00", "11:00")]));
    expect(b.long).toMatchObject({ left: 0, width: 100 });
    expect(b.late).toMatchObject({ left: STACK_INDENT, width: 100 - STACK_INDENT });
    expect(b.late.zIndex).toBeGreaterThan(b.long.zIndex);
  });

  it("short events get a minimum height", () => {
    expect(layoutDay([ev("s", "09:00", "09:05")])[0].height).toBe(MIN_EVENT_HEIGHT);
  });
});

describe("layoutAllDay", () => {
  const days = ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"];

  it("packs bars into lanes without overlap", () => {
    const placed = layoutAllDay(
      [
        { id: "multi", startDate: "2026-10-12", endDate: "2026-10-15" },
        { id: "one", startDate: "2026-10-13", endDate: "2026-10-14" },
        { id: "later", startDate: "2026-10-15", endDate: "2026-10-16" },
      ],
      days,
    );
    const p = Object.fromEntries(placed.map((x) => [x.occurrence.id, x]));
    expect(p.multi).toMatchObject({ lane: 0, startCol: 1, span: 3 });
    expect(p.one).toMatchObject({ lane: 1, startCol: 2, span: 1 });
    expect(p.later).toMatchObject({ lane: 0, startCol: 4, span: 1 });
  });

  it("marks bars cut at the week edges", () => {
    const [p] = layoutAllDay([{ startDate: "2026-10-09", endDate: "2026-10-20" }], days);
    expect(p).toMatchObject({ startCol: 0, span: 7, continuesBefore: true, continuesAfter: true });
  });
});
