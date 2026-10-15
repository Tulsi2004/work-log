"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, startOfDay } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Menu, Search, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRangeTitle, getVisibleRange, navigate, VIEW_LABELS, type ViewKey } from "@/lib/calendar/dates";
import { useUI } from "@/lib/calendar/ui-store";
import { useCalendarRoute } from "@/hooks/calendar/use-calendar-route";
import { useSettings, useUpdateSettings } from "@/hooks/calendar/use-calendar-settings";
import { useNow } from "@/hooks/calendar/use-now";
import { IconButton } from "./parts";

const PERIOD: Record<ViewKey, string> = {
  day: "day",
  "4days": "4 days",
  week: "week",
  month: "month",
  year: "year",
  schedule: "week",
};
const SWITCHER_ORDER: ViewKey[] = ["day", "week", "month", "year", "schedule", "4days"];

/** The hamburger opens the drawer below 1024px and folds the sidebar above it. */
function toggleSidebar() {
  const ui = useUI.getState();
  if (window.matchMedia("(min-width: 1024px)").matches) ui.set({ sidebarOpen: !ui.sidebarOpen });
  else ui.set({ drawerOpen: !ui.drawerOpen });
}

function SearchBox({ onSearchPage }: { onSearchPage: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const set = useUI((s) => s.set);
  const [q, setQ] = useState(params.get("q") ?? "");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/calendar/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex h-10 min-w-0 flex-1 items-center rounded-lg bg-muted px-1 sm:max-w-[560px]"
    >
      <Search className="mx-2 size-4 shrink-0 text-muted-foreground" />
      <input
        id="cal-search"
        autoFocus={!onSearchPage}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          if (onSearchPage) e.currentTarget.blur();
          else set({ searchOpen: false });
        }}
        placeholder="Search events"
        aria-label="Search events"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      {q && (
        <IconButton label="Clear search" size="icon-sm" onClick={() => setQ("")}>
          <X />
        </IconButton>
      )}
      {!onSearchPage && (
        <IconButton label="Close search" size="icon-sm" onClick={() => set({ searchOpen: false })}>
          <ChevronRight />
        </IconButton>
      )}
    </form>
  );
}

function ViewSwitcher() {
  const { view, date, go } = useCalendarRoute();
  const { showWeekends } = useSettings();
  const update = useUpdateSettings();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 rounded-full px-3 sm:px-4">
          {VIEW_LABELS[view].label}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {SWITCHER_ORDER.map((v) => (
          <DropdownMenuItem key={v} onSelect={() => go(v, date)}>
            {VIEW_LABELS[v].label}
            <DropdownMenuShortcut>{VIEW_LABELS[v].key}</DropdownMenuShortcut>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={showWeekends}
          onCheckedChange={(checked) => update.mutate({ showWeekends: checked === true })}
        >
          Show weekends
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CalendarToolbar() {
  const pathname = usePathname();
  const { view, date, go } = useCalendarRoute();
  const { weekStartsOn, showWeekends } = useSettings();
  const searchOpen = useUI((s) => s.searchOpen);
  const set = useUI((s) => s.set);
  const today = startOfDay(useNow());
  const onSearchPage = pathname === "/calendar/search";
  const range = getVisibleRange(view, date, weekStartsOn, showWeekends);
  const showSearch = searchOpen || onSearchPage;

  return (
    <div className="flex h-14 shrink-0 items-center gap-1 border-b px-2 sm:gap-2 sm:px-3">
      <IconButton label="Main menu" onClick={toggleSidebar}>
        <Menu />
      </IconButton>
      <div className={showSearch ? "flex items-center gap-1 max-md:hidden sm:gap-2" : "flex min-w-0 items-center gap-1 sm:gap-2"}>
        <Button
          variant="outline"
          className="h-9 rounded-full px-4"
          title={format(today, "EEEE, MMMM d")}
          onClick={() => go(view, today)}
        >
          Today
        </Button>
        <IconButton label={`Previous ${PERIOD[view]}`} onClick={() => go(view, navigate(view, date, -1))}>
          <ChevronLeft />
        </IconButton>
        <IconButton label={`Next ${PERIOD[view]}`} onClick={() => go(view, navigate(view, date, 1))}>
          <ChevronRight />
        </IconButton>
        <h1 className="truncate text-lg sm:text-xl">{onSearchPage ? "Search" : formatRangeTitle(view, range)}</h1>
      </div>
      {!showSearch && <div className="flex-1" />}
      {showSearch ? (
        <SearchBox onSearchPage={onSearchPage} />
      ) : (
        <IconButton label="Search" onClick={() => set({ searchOpen: true })}>
          <Search />
        </IconButton>
      )}
      <IconButton label="Keyboard shortcuts" className="max-md:hidden" onClick={() => set({ dialog: "shortcuts" })}>
        <CircleHelp />
      </IconButton>
      <IconButton label="Calendar settings" className="max-md:hidden" asChild>
        <Link href="/calendar/settings">
          <Settings />
        </Link>
      </IconButton>
      <ViewSwitcher />
    </div>
  );
}
