import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";
import { layoutAllDay } from "../allDayLayout";
import { dateKey } from "../dates";
import {
  computeRecurrenceEndAt,
  describeRRule,
  expandEvents,
  FAR_FUTURE,
  type EventLike,
  type ExceptionLike,
  formToRRule,
  rruleToForm,
  shiftRRuleDays,
  splitRRule,
  toWall,
} from "../recurrence";

const NY = "America/New_York";
const base: Omit<EventLike, "id"> = {
  calendarId: "cal",
  title: "Standup",
  description: null,
  location: null,
  color: null,
  isAllDay: false,
  startAt: null,
  endAt: null,
  timezone: NY,
  startDate: null,
  endDate: null,
  rrule: null,
};
const exception = (over: Partial<ExceptionLike> & Pick<ExceptionLike, "originalStart">): ExceptionLike => ({
  eventId: "weekly",
  isCancelled: false,
  title: null,
  description: null,
  location: null,
  color: null,
  startAt: null,
  endAt: null,
  startDate: null,
  endDate: null,
  ...over,
});

// Monday Oct 19 2026, 9:00 New York. US DST ends Sunday Nov 1 2026.
const weekly: EventLike = {
  ...base,
  id: "weekly",
  startAt: fromZonedTime("2026-10-19T09:00:00", NY),
  endAt: fromZonedTime("2026-10-19T09:30:00", NY),
  rrule: "FREQ=WEEKLY;BYDAY=MO",
};
const ny = (s: string) => fromZonedTime(s, NY);

describe("expandEvents", () => {
  it("weekly event stays at 9:00 local across a DST change", () => {
    const occ = expandEvents([weekly], [], ny("2026-10-18T00:00:00"), ny("2026-11-15T00:00:00"), NY);
    expect(occ.map((o) => formatInTimeZone(o.start, NY, "yyyy-MM-dd HH:mm"))).toEqual([
      "2026-10-19 09:00",
      "2026-10-26 09:00",
      "2026-11-02 09:00",
      "2026-11-09 09:00",
    ]);
    expect(occ[0].start.toISOString()).toBe("2026-10-19T13:00:00.000Z"); // EDT
    expect(occ[2].start.toISOString()).toBe("2026-11-02T14:00:00.000Z"); // EST
    expect(occ[0].occurrenceId).toBe("weekly:2026-10-19T13:00:00.000Z");
  });

  it("drops cancelled occurrences", () => {
    const occ = expandEvents(
      [weekly],
      [exception({ originalStart: new Date("2026-10-26T13:00:00.000Z"), isCancelled: true })],
      ny("2026-10-18T00:00:00"),
      ny("2026-11-08T00:00:00"),
      NY,
    );
    expect(occ.map((o) => formatInTimeZone(o.start, NY, "MM-dd"))).toEqual(["10-19", "11-02"]);
  });

  it("shows an occurrence moved into the range from outside it", () => {
    // Nov 9's occurrence is moved to Wednesday Nov 4; the visible week is Nov 1-7.
    const moved = exception({
      originalStart: ny("2026-11-09T09:00:00"),
      title: "Moved standup",
      startAt: ny("2026-11-04T10:00:00"),
      endAt: ny("2026-11-04T10:30:00"),
    });
    const occ = expandEvents([weekly], [moved], ny("2026-11-01T00:00:00"), ny("2026-11-08T00:00:00"), NY);
    expect(occ.map((o) => [o.title, formatInTimeZone(o.start, NY, "MM-dd HH:mm")])).toEqual([
      ["Standup", "11-02 09:00"],
      ["Moved standup", "11-04 10:00"],
    ]);
    // ...and it is gone from its original week.
    const original = expandEvents([weekly], [moved], ny("2026-11-08T00:00:00"), ny("2026-11-15T00:00:00"), NY);
    expect(original).toHaveLength(0);
  });

  it.each(["Asia/Kolkata", "America/Los_Angeles"])("all-day Oct 11 shows on exactly one day in %s", (tz) => {
    const holiday: EventLike = {
      ...base,
      id: "navratri",
      isAllDay: true,
      timezone: "Asia/Kolkata",
      startDate: "2026-10-11",
      endDate: "2026-10-12",
    };
    const week = expandEvents(
      [holiday],
      [],
      fromZonedTime("2026-10-11T00:00:00", tz),
      fromZonedTime("2026-10-18T00:00:00", tz),
      tz,
    );
    expect(week).toHaveLength(1);
    const days = Array.from({ length: 7 }, (_, i) => dateKey(new Date(2026, 9, 11 + i)));
    const [bar] = layoutAllDay(week as { startDate: string; endDate: string }[], days);
    expect(bar).toMatchObject({ startCol: 0, span: 1 });

    const dayView = (key: string) =>
      expandEvents([holiday], [], fromZonedTime(`${key}T00:00:00`, tz), fromZonedTime(`${key}T23:59:59.999`, tz), tz);
    expect(dayView("2026-10-10")).toHaveLength(0);
    expect(dayView("2026-10-11")).toHaveLength(1);
    expect(dayView("2026-10-12")).toHaveLength(0);
  });

  it("expands recurring all-day events by date", () => {
    const yearly: EventLike = {
      ...base,
      id: "bday",
      isAllDay: true,
      startDate: "2025-03-02",
      endDate: "2025-03-03",
      rrule: "FREQ=YEARLY",
    };
    const occ = expandEvents([yearly], [], new Date("2026-01-01T00:00:00Z"), new Date("2027-01-01T00:00:00Z"), "UTC");
    expect(occ.map((o) => [o.startDate, o.endDate])).toEqual([["2026-03-02", "2026-03-03"]]);
    expect(occ[0].originalStart?.toISOString()).toBe("2026-03-02T00:00:00.000Z");
  });
});

describe("rrule helpers", () => {
  const wed = new Date(2026, 9, 14); // Wednesday Oct 14 2026 (2nd Wednesday)

  it("describes rules", () => {
    expect(describeRRule(null, wed)).toBe("Does not repeat");
    expect(describeRRule("FREQ=WEEKLY;BYDAY=WE,MO", wed)).toBe("Weekly on Monday, Wednesday");
    expect(describeRRule("FREQ=MONTHLY;BYDAY=2WE", wed)).toBe("Monthly on the second Wednesday");
    expect(describeRRule("FREQ=DAILY;INTERVAL=2;UNTIL=20261231T235959Z", wed)).toBe("Every 2 days, until Dec 31, 2026");
    expect(describeRRule("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", wed)).toBe("Every weekday (Monday to Friday)");
    expect(describeRRule("FREQ=YEARLY", wed)).toBe("Annually on October 14");
  });

  it("round-trips the custom form", () => {
    const rule = "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=5";
    expect(formToRRule(rruleToForm(rule, wed, "2026-12-31"), wed)).toBe(rule);
    const monthly = formToRRule({ ...rruleToForm(null, wed, "2026-12-31"), freq: "MONTHLY", monthlyMode: "nth" }, wed);
    expect(monthly).toBe("FREQ=MONTHLY;BYDAY=2WE");
  });

  it("splits a series for 'this and following'", () => {
    const dtstart = toWall(weekly.startAt!, NY);
    const split = toWall(ny("2026-11-02T09:00:00"), NY);
    expect(splitRRule("FREQ=WEEKLY;BYDAY=MO", dtstart, split)).toEqual({
      before: "FREQ=WEEKLY;BYDAY=MO;UNTIL=20261102T085959Z",
      after: "FREQ=WEEKLY;BYDAY=MO",
    });
    expect(splitRRule("FREQ=WEEKLY;BYDAY=MO;COUNT=10", dtstart, split).after).toBe("FREQ=WEEKLY;BYDAY=MO;COUNT=8");
  });

  it("shifts weekdays when a series moves by days", () => {
    expect(shiftRRuleDays("FREQ=WEEKLY;BYDAY=MO,SA", 1)).toBe("FREQ=WEEKLY;BYDAY=TU,SU");
    expect(shiftRRuleDays("FREQ=MONTHLY;BYDAY=2WE", -1)).toBe("FREQ=MONTHLY;BYDAY=2TU");
  });

  it("computes the series end for range queries", () => {
    expect(computeRecurrenceEndAt(weekly)).toEqual(FAR_FUTURE);
    const counted = { ...weekly, rrule: "FREQ=WEEKLY;BYDAY=MO;COUNT=3" };
    expect(computeRecurrenceEndAt(counted)?.toISOString()).toBe("2026-11-02T14:30:00.000Z");
  });
});
