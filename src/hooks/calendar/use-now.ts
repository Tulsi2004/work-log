"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toUserTz } from "@/lib/calendar/dates";
import { useUserTz } from "./use-calendar-settings";

/** Now as a local copy in the user's zone, re-rendered on every minute boundary. */
export function useNow() {
  const tz = useUserTz();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
    };
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
    return () => clearTimeout(timer);
  }, []);
  return toUserTz(now, tz);
}

const subscribeNever = () => () => {};
/** False on the server and during hydration, so "now"-dependent pixels render only after mount. */
export const useMounted = () => useSyncExternalStore(subscribeNever, () => true, () => false);
