import type { TimeFormatKey, ViewKey, WeekStart } from "./dates";
import type { Occurrence } from "./recurrence";
import type { EventSnapshot } from "./validators";

/** JSON form of a type: Dates become ISO strings. */
export type Jsonify<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;

export type CalendarSettings = {
  timezone: string;
  weekStartsOn: WeekStart;
  showWeekends: boolean;
  defaultView: ViewKey;
  defaultEventDuration: number;
  timeFormat: TimeFormatKey;
};

export type CalendarKind = "OWNED" | "HOLIDAY";
export type CalendarDTO = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  kind: CalendarKind;
  isPrimary: boolean;
  isVisible: boolean;
  isHidden: boolean;
  isReadOnly: boolean;
  sortOrder: number;
};

export type EventSnapshotJSON = Jsonify<EventSnapshot>;
export type EventDetail = {
  event: EventSnapshotJSON;
  occurrence: Jsonify<Occurrence> | null;
  isReadOnly: boolean;
};

export type UndoInfo = { snapshots: EventSnapshotJSON[]; deleteIds: string[] };
