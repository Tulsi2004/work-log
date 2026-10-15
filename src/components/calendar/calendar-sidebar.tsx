"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addMinutes } from "date-fns";
import { ChevronDown, MoreVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CALENDAR_COLORS } from "@/lib/calendar/colors";
import { nextHalfHour, toUserTz } from "@/lib/calendar/dates";
import { newEventHref } from "@/lib/calendar/routes";
import type { CalendarDTO } from "@/lib/calendar/types";
import { useUI } from "@/lib/calendar/ui-store";
import { useCalendarMutations, useCalendars, useSettings } from "@/hooks/calendar/use-calendar-settings";
import { MiniCalendar } from "./mini-calendar";
import { ColorSwatches, IconButton } from "./parts";

function CalendarRow({ cal }: { cal: CalendarDTO }) {
  const { update, displayOnly } = useCalendarMutations();
  return (
    <div className="group flex h-8 items-center gap-1 rounded-md pr-1 pl-3 hover:bg-muted">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={cal.isVisible}
          onChange={(e) => update(cal.id, { isVisible: e.target.checked })}
          className="size-4 shrink-0 cursor-pointer"
          style={{ accentColor: cal.color }}
        />
        <span className="truncate">{cal.name}</span>
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            label={`Options for ${cal.name}`}
            size="icon-sm"
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <MoreVertical />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onSelect={() => displayOnly(cal.id)}>Display this only</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => update(cal.id, { isHidden: true })}>Hide from list</DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/calendar/settings#calendars">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ColorSwatches colors={CALENDAR_COLORS} value={cal.color} onPick={(hex) => hex && update(cal.id, { color: hex })} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="px-2">
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex h-9 flex-1 items-center justify-between rounded-md px-2 text-sm font-medium hover:bg-muted"
        >
          {title}
          <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
        </button>
        {action}
      </div>
      {open && children}
    </section>
  );
}

export function CalendarSidebar() {
  const router = useRouter();
  const sidebarOpen = useUI((s) => s.sidebarOpen);
  const drawerOpen = useUI((s) => s.drawerOpen);
  const set = useUI((s) => s.set);
  const { timezone, defaultEventDuration } = useSettings();
  const calendars = useCalendars();
  const mine = calendars.filter((c) => c.kind !== "HOLIDAY" && !c.isHidden);
  const other = calendars.filter((c) => c.kind === "HOLIDAY" && !c.isHidden);

  const create = () => {
    const start = nextHalfHour(toUserTz(new Date(), timezone));
    set({ drawerOpen: false });
    router.push(newEventHref({ start, end: addMinutes(start, defaultEventDuration), isAllDay: false }, timezone));
  };

  return (
    <>
      {drawerOpen && (
        <div aria-hidden className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => set({ drawerOpen: false })} />
      )}
      <aside
        aria-label="Calendars"
        className={cn(
          "flex w-64 shrink-0 flex-col gap-4 overflow-y-auto bg-background py-3",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:shadow-xl",
          drawerOpen ? "max-lg:flex" : "max-lg:hidden",
          sidebarOpen ? "lg:flex" : "lg:hidden",
        )}
      >
        <div className="px-3">
          <Button variant="outline" onClick={create} className="h-12 rounded-2xl pr-5 pl-4 shadow-md">
            <Plus className="size-5" />
            Create
          </Button>
        </div>
        <MiniCalendar />
        <Section title="My calendars">
          {mine.map((c) => (
            <CalendarRow key={c.id} cal={c} />
          ))}
        </Section>
        <Section
          title="Other calendars"
          action={
            <IconButton label="Create new calendar" size="icon-sm" onClick={() => set({ dialog: "newCalendar" })}>
              <Plus />
            </IconButton>
          }
        >
          {other.map((c) => (
            <CalendarRow key={c.id} cal={c} />
          ))}
        </Section>
      </aside>
    </>
  );
}
