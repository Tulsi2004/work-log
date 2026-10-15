"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  AlignLeft,
  CalendarDays,
  Clock,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { EVENT_COLORS } from "@/lib/calendar/colors";
import { dateKey, fromUserTz, whenText } from "@/lib/calendar/dates";
import { editHref, newEventHref } from "@/lib/calendar/routes";
import { describeRRule } from "@/lib/calendar/recurrence";
import { openDetail, useUI } from "@/lib/calendar/ui-store";
import { eventCreateSchema } from "@/lib/calendar/validators";
import type { CalItem } from "@/hooks/calendar/use-calendar-items";
import { useCalendarRoute } from "@/hooks/calendar/use-calendar-route";
import { useCalendars, useSettings } from "@/hooks/calendar/use-calendar-settings";
import { useEventMutations } from "@/hooks/calendar/use-event-mutations";
import { ColorSwatches, IconButton, ItemChip } from "./parts";
import { RecurrenceSelect } from "./recurrence-controls";

const EVENT_SWATCHES = [...EVENT_COLORS, { name: "Calendar color", hex: null }];

/** Turns URLs in plain text into links. */
function Linkified({ text }: { text: string }) {
  return text.split(/(https?:\/\/[^\s<]+)/g).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all text-primary underline">
        {part}
      </a>
    ) : (
      part
    ),
  );
}

const mapsLink = (location: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

/** Quick Create: title, when, repeat, location, description and calendar — Enter saves. */
function QuickCreate() {
  const router = useRouter();
  const draft = useUI((s) => s.draft);
  const title = useUI((s) => s.draftTitle);
  const set = useUI((s) => s.set);
  const close = useUI((s) => s.closePopover);
  const { timezone: tz, timeFormat: fmt } = useSettings();
  const writable = useCalendars().filter((c) => c.kind === "OWNED" && !c.isReadOnly);
  const [calendarId, setCalendarId] = useState(writable.find((c) => c.isPrimary)?.id ?? writable[0]?.id ?? "");
  const [rrule, setRrule] = useState<string | null>(null);
  // null = the row is still collapsed behind its "Add …" button.
  const [location, setLocation] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { create } = useEventMutations();
  if (!draft) return null;
  const color = writable.find((c) => c.id === calendarId)?.color;

  const payload = () => ({
    calendarId,
    title,
    description: description || null,
    location: location || null,
    color: null,
    isAllDay: draft.isAllDay,
    timezone: tz,
    rrule,
    ...(draft.isAllDay
      ? { startAt: null, endAt: null, startDate: dateKey(draft.start), endDate: dateKey(draft.end) }
      : {
          startAt: fromUserTz(draft.start, tz).toISOString(),
          endAt: fromUserTz(draft.end, tz).toISOString(),
          startDate: null,
          endDate: null,
        }),
  });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const p = payload();
    const parsed = eventCreateSchema.safeParse(p);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    close();
    create(p);
  };

  const moreOptions = () => {
    close();
    router.push(newEventHref({ ...draft, title, calendarId, description, location, rrule }, tz));
  };

  return (
    <form onSubmit={save}>
      <div className="flex h-9 items-center justify-end rounded-t-lg bg-muted px-1">
        <IconButton label="Close" size="icon-sm" onClick={close}>
          <X />
        </IconButton>
      </div>
      <div className="space-y-3 p-4 pl-14">
        <input
          autoFocus
          aria-label="Title"
          placeholder="Add title"
          value={title}
          onChange={(e) => set({ draftTitle: e.target.value })}
          className="w-full border-b-2 border-transparent bg-transparent pb-1 text-[22px] outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <div className="relative space-y-2 text-sm">
          <Clock className="absolute top-1 -left-9 size-4 text-muted-foreground" />
          <p>{whenText(draft.start, draft.end, draft.isAllDay, fmt)}</p>
          <RecurrenceSelect value={rrule} onChange={setRrule} start={draft.start} className="h-8 max-w-full" />
        </div>
        <div className="relative">
          <MapPin className="absolute top-2 -left-9 size-4 text-muted-foreground" />
          {location === null ? (
            <button type="button" onClick={() => setLocation("")} className="h-8 text-sm text-muted-foreground hover:text-foreground">
              Add location
            </button>
          ) : (
            <input
              autoFocus
              aria-label="Location"
              placeholder="Add location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-8 w-full rounded-md bg-muted px-2 text-sm outline-none"
            />
          )}
        </div>
        <div className="relative">
          <AlignLeft className="absolute top-2 -left-9 size-4 text-muted-foreground" />
          {description === null ? (
            <button type="button" onClick={() => setDescription("")} className="h-8 text-sm text-muted-foreground hover:text-foreground">
              Add description
            </button>
          ) : (
            <Textarea
              autoFocus
              aria-label="Description"
              placeholder="Add description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          )}
        </div>
        <div className="relative flex items-center gap-2">
          <CalendarDays className="absolute top-2 -left-9 size-4 text-muted-foreground" />
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <select
            aria-label="Calendar"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md bg-transparent text-sm hover:bg-muted"
          >
            {writable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 px-4 pb-4">
        <Button type="button" variant="ghost" onClick={moreOptions}>
          More options
        </Button>
        <Button type="submit" className="rounded-full px-6">
          Save
        </Button>
      </div>
    </form>
  );
}

function EventDetail({ item }: { item: CalItem }) {
  const router = useRouter();
  const close = useUI((s) => s.closePopover);
  const { timezone: tz, timeFormat: fmt } = useSettings();
  const calendars = useCalendars();
  const { remove, update } = useEventMutations();
  const cal = calendars.find((c) => c.id === item.calendarId);
  const editable = !item.readOnly;

  const duplicate = () => {
    const writable = cal && !cal.isReadOnly ? cal : calendars.find((c) => c.isPrimary);
    close();
    router.push(
      newEventHref(
        {
          start: item.fStart,
          end: item.fEnd,
          isAllDay: item.isAllDay,
          title: item.title,
          calendarId: writable?.id,
          description: item.description,
          location: item.location,
          rrule: item.rrule,
          color: item.color,
          tz: item.isAllDay || item.timezone === tz ? undefined : item.timezone,
        },
        tz,
      ),
    );
  };

  return (
    <div className="pb-4">
      <div className="flex justify-end gap-0.5 p-1.5">
        {editable && (
          <IconButton
            label="Edit event"
            onClick={() => {
              close();
              router.push(editHref(item.occurrenceId));
            }}
          >
            <Pencil />
          </IconButton>
        )}
        {editable && (
          <IconButton
            label="Delete event"
            onClick={() => {
              close();
              remove(item);
            }}
          >
            <Trash2 />
          </IconButton>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="Options">
              <MoreVertical />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={duplicate}>Duplicate</DropdownMenuItem>
            {editable && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Change color</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <ColorSwatches
                    colors={EVENT_SWATCHES}
                    value={item.color}
                    nullColor={cal?.color}
                    onPick={(hex) => {
                      close();
                      update(item, { color: hex });
                    }}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <IconButton label="Close" onClick={close}>
          <X />
        </IconButton>
      </div>
      <div className="space-y-4 pr-6 pl-5 text-sm">
        <div className="flex gap-5">
          <span className="mt-2 size-3.5 shrink-0 rounded-[4px]" style={{ backgroundColor: item.displayColor }} />
          <div className="min-w-0">
            <h2 className="text-[22px] leading-snug break-words">{item.title}</h2>
            <p>{whenText(item.fStart, item.fEnd, item.isAllDay, fmt)}</p>
            {item.rrule && <p>{describeRRule(item.rrule, item.fStart)}</p>}
          </div>
        </div>
        {item.location && (
          <div className="flex gap-5">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <a href={mapsLink(item.location)} target="_blank" rel="noreferrer" className="min-w-0 break-words hover:underline">
              {item.location}
            </a>
          </div>
        )}
        {item.description && (
          <div className="flex gap-5">
            <AlignLeft className="size-4 shrink-0 text-muted-foreground" />
            <p className="max-h-60 min-w-0 overflow-y-auto break-words whitespace-pre-wrap">
              <Linkified text={item.description} />
            </p>
          </div>
        )}
        <div className="flex gap-5">
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span>{cal?.name}</span>
        </div>
      </div>
    </div>
  );
}

function DayList({ date, items }: { date: Date; items: CalItem[] }) {
  const close = useUI((s) => s.closePopover);
  const { go } = useCalendarRoute();
  const { timeFormat: fmt } = useSettings();
  return (
    <div className="p-2">
      <div className="flex justify-end">
        <IconButton label="Close" size="icon-sm" onClick={close}>
          <X />
        </IconButton>
      </div>
      <div className="mb-2 flex flex-col items-center">
        <span className="text-[11px] font-medium text-muted-foreground uppercase">{format(date, "EEE")}</span>
        <button
          type="button"
          aria-label={`Go to ${format(date, "EEEE, MMMM d")}`}
          onClick={() => {
            close();
            go("day", date);
          }}
          className="grid size-12 place-items-center rounded-full text-2xl hover:bg-muted"
        >
          {date.getDate()}
        </button>
      </div>
      {items.length ? (
        <div className="space-y-0.5">
          {items.map((it) => (
            <ItemChip key={it.occurrenceId} item={it} fmt={fmt} onClick={(e) => openDetail(it, e.currentTarget)} />
          ))}
        </div>
      ) : (
        <p className="px-2 pb-2 text-center text-sm text-muted-foreground">There are no events scheduled on this day.</p>
      )}
    </div>
  );
}

/** The one popover host: Quick Create, event details, or a day's list — anchored where they were opened. */
export function EventPopovers() {
  const popover = useUI((s) => s.popover);
  const close = useUI((s) => s.closePopover);
  if (!popover) return null;
  const label =
    popover.kind === "create" ? "Create" : popover.kind === "detail" ? popover.item.title : format(popover.date, "EEEE, MMMM d");
  return (
    <Popover open onOpenChange={(open) => !open && close()}>
      <PopoverAnchor virtualRef={{ current: popover.anchor }} />
      <PopoverContent
        side="right"
        align="start"
        collisionPadding={16}
        aria-label={label}
        tabIndex={-1}
        // Details take focus themselves, so no button tooltip pops up; Quick Create focuses its title.
        onOpenAutoFocus={(e) => {
          if (popover.kind === "create") return;
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
        className={cn(
          "gap-0 overflow-y-auto p-0 shadow-xl",
          popover.kind === "day" ? "w-60" : "w-[min(448px,calc(100vw-32px))]",
          "max-h-(--radix-popover-content-available-height)",
        )}
      >
        {popover.kind === "create" ? (
          <QuickCreate />
        ) : popover.kind === "detail" ? (
          <EventDetail key={popover.item.occurrenceId} item={popover.item} />
        ) : (
          <DayList date={popover.date} items={popover.items} />
        )}
      </PopoverContent>
    </Popover>
  );
}
