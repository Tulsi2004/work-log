"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { startOfDay } from "date-fns";
import { calendarPath, isViewKey, parseDateKey, toUserTz, type ViewKey } from "@/lib/calendar/dates";
import { routeDate } from "@/lib/calendar/routes";
import { useUI } from "@/lib/calendar/ui-store";
import { useSettings } from "./use-calendar-settings";

/** The view and date in the URL, or — off the calendar routes — the last ones shown. */
export function useCalendarRoute() {
  const params = useParams<{ view?: string; y?: string; m?: string; d?: string }>();
  const router = useRouter();
  const settings = useSettings();
  const lastView = useUI((s) => s.lastView);
  const lastDate = useUI((s) => s.lastDate);
  const urlDate = routeDate(params.y, params.m, params.d);
  const onCalendar = !!params.view && isViewKey(params.view) && !!urlDate;

  const view: ViewKey = onCalendar ? (params.view as ViewKey) : (lastView ?? settings.defaultView);
  const date =
    onCalendar && urlDate
      ? urlDate
      : lastDate
        ? parseDateKey(lastDate)
        : startOfDay(toUserTz(new Date(), settings.timezone));

  const go = useCallback((v: ViewKey, d: Date) => router.push(calendarPath(v, d)), [router]);
  return { view, date, go, onCalendar };
}
