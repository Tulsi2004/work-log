"use client";

import { createContext, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/calendar/client";
import type { CalendarDTO, CalendarSettings } from "@/lib/calendar/types";

type Initial = { settings: CalendarSettings; calendars: CalendarDTO[] };
const InitialContext = createContext<Initial | null>(null);

/** Hands the server-loaded settings and calendars to the queries below as their first data. */
export function CalendarProvider({ children, ...initial }: Initial & { children: React.ReactNode }) {
  return <InitialContext.Provider value={initial}>{children}</InitialContext.Provider>;
}

function useInitial() {
  const initial = useContext(InitialContext);
  if (!initial) throw new Error("useInitial must be used inside <CalendarProvider>");
  return initial;
}

export function useSettings(): CalendarSettings {
  const { settings } = useInitial();
  return useQuery({
    queryKey: ["cal-settings"],
    queryFn: () => api<CalendarSettings>("/api/calendar/settings"),
    initialData: settings,
    staleTime: Infinity,
  }).data;
}

export function useCalendars(): CalendarDTO[] {
  const { calendars } = useInitial();
  return useQuery({
    queryKey: ["cal-calendars"],
    queryFn: () => api<CalendarDTO[]>("/api/calendar/calendars"),
    initialData: calendars,
    staleTime: Infinity,
  }).data;
}

export const useUserTz = () => useSettings().timezone;

const SETTINGS_KEY = ["cal-settings"];

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: SETTINGS_KEY,
    mutationFn: (patch: Partial<CalendarSettings>) =>
      api<CalendarSettings>("/api/calendar/settings", { method: "PATCH", json: patch }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: SETTINGS_KEY });
      const prev = qc.getQueryData<CalendarSettings>(SETTINGS_KEY);
      qc.setQueryData<CalendarSettings>(SETTINGS_KEY, (old) => old && { ...old, ...patch });
      return { prev };
    },
    onError: (e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(SETTINGS_KEY, ctx.prev);
      toast.error(`Couldn't save settings: ${e.message}`);
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
    onSuccess: (data, patch) => {
      // Quick toggles: only the last pending save may write the server's answer,
      // or an earlier reply would undo a later toggle on screen.
      if (qc.isMutating({ mutationKey: SETTINGS_KEY }) === 1) qc.setQueryData(SETTINGS_KEY, data);
      if (patch.timezone)
        qc.invalidateQueries({
          predicate: (q) => String(q.queryKey[0]).startsWith("cal-") && q.queryKey[0] !== "cal-settings",
        });
    },
  });
}

const CALENDARS_KEY = ["cal-calendars"];

/** Optimistic calendar edits: the sidebar and grid react before the server answers. */
export function useCalendarMutations() {
  const qc = useQueryClient();

  async function optimistic<T>(edit: (list: CalendarDTO[]) => CalendarDTO[], request: () => Promise<T>) {
    await qc.cancelQueries({ queryKey: CALENDARS_KEY });
    const prev = qc.getQueryData<CalendarDTO[]>(CALENDARS_KEY);
    qc.setQueryData<CalendarDTO[]>(CALENDARS_KEY, (old) => old && edit(old));
    try {
      return await request();
    } catch (e) {
      qc.setQueryData(CALENDARS_KEY, prev);
      toast.error((e as Error).message);
      return null;
    } finally {
      qc.invalidateQueries({ queryKey: CALENDARS_KEY });
    }
  }

  const update = (id: string, patch: Partial<CalendarDTO>) =>
    optimistic(
      (list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      () => api<CalendarDTO>(`/api/calendar/calendars/${id}`, { method: "PATCH", json: patch }),
    );

  /** "Display this only": shows one calendar and hides the rest. */
  const displayOnly = (id: string) => {
    const list = qc.getQueryData<CalendarDTO[]>(CALENDARS_KEY) ?? [];
    return optimistic(
      (all) => all.map((c) => ({ ...c, isVisible: c.id === id })),
      () =>
        Promise.all(
          list
            .filter((c) => c.isVisible !== (c.id === id))
            .map((c) =>
              api(`/api/calendar/calendars/${c.id}`, { method: "PATCH", json: { isVisible: c.id === id } }),
            ),
        ),
    );
  };

  const create = (input: { name: string; description?: string | null; color: string }) =>
    optimistic(
      (list) => list,
      () => api<CalendarDTO>("/api/calendar/calendars", { method: "POST", json: input }),
    );

  const remove = (id: string) =>
    optimistic(
      (list) => list.filter((c) => c.id !== id),
      async () => {
        await api(`/api/calendar/calendars/${id}`, { method: "DELETE" });
        qc.invalidateQueries({ queryKey: ["cal-occurrences"] });
        return true;
      },
    );

  return { update, displayOnly, create, remove };
}
