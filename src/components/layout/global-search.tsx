"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarCheck, ClipboardList, Search, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useEmployments } from "@/hooks/use-employments";
import { employmentLabel, formatDate, formatMoney } from "@/utils/format";
import type {
  DayPlanWithEmployment,
  SalaryEntryWithEmployment,
  WorkReportTask,
  WorkReportWithEmployment,
} from "@/types";

// How many hits each section shows before "see all" takes over.
const PER_GROUP = 5;

interface Hit {
  key: string;
  title: string;
  detail?: string;
  href: string;
}

interface Group {
  name: string;
  icon: LucideIcon;
  hits: Hit[];
  total: number;
  // The page with its own search box filled in, for everything past the first few.
  seeAll: string;
}

async function fetchData<T>(url: string): Promise<T[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Search failed");
  return ((await res.json()) as { data: T[] }).data;
}

// The pages already know how to search their own records, so this asks each one
// rather than keeping a second copy of every search rule in one place.
function useSearch(query: string) {
  return useQuery({
    queryKey: ["global-search", query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const q = encodeURIComponent(query);
      const [reports, plans, money] = await Promise.all([
        fetchData<WorkReportWithEmployment>(`/api/work-reports?search=${q}`),
        fetchData<DayPlanWithEmployment>(`/api/day-plans?search=${q}`),
        fetchData<SalaryEntryWithEmployment>(`/api/salary-entries?search=${q}`),
      ]);
      return { reports, plans, money };
    },
    placeholderData: (prev) => prev,
  });
}

function firstTask(report: WorkReportWithEmployment): string | undefined {
  const tasks = (report.tasks as WorkReportTask[] | null) ?? [];
  return tasks.find((t) => t.task?.trim())?.task;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim());
  const { data, isFetching } = useSearch(debounced);
  const { data: employments } = useEmployments();

  // Ctrl+K (⌘K on a Mac) from anywhere in the app.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const q = encodeURIComponent(debounced);
  const term = debounced.toLowerCase();
  const companies = (employments ?? []).filter((e) => employmentLabel(e).toLowerCase().includes(term));

  const groups: Group[] =
    debounced.length < 2 || !data
      ? []
      : [
          {
            name: "Work log",
            icon: ClipboardList,
            total: data.reports.length,
            seeAll: `/?q=${q}`,
            hits: data.reports.map((r) => ({
              key: r.id,
              title: `${formatDate(r.date)} — ${firstTask(r) ?? r.notes ?? r.leaveReason ?? r.dayType}`,
              detail: employmentLabel(r.employment),
              // The work log shows one company at a time, so open the report's own.
              href: `/?q=${q}&employmentId=${r.employmentId}`,
            })),
          },
          {
            name: "Planner",
            icon: CalendarCheck,
            total: data.plans.length,
            seeAll: `/planner?q=${q}`,
            hits: data.plans.map((p) => ({
              key: p.id,
              title: `${formatDate(p.date)} — ${p.title}`,
              detail: p.isDone ? "Done" : undefined,
              href: `/planner?q=${q}`,
            })),
          },
          {
            name: "Money",
            icon: Wallet,
            total: data.money.length,
            seeAll: `/money?q=${q}`,
            hits: data.money.map((m) => ({
              key: m.id,
              title: `${formatDate(m.date)} — ${formatMoney(m.amount)}${m.source ? ` · ${m.source}` : ""}`,
              // The spend that matched, when it was a spend rather than the entry.
              detail: m.spends.find((s) => s.what.toLowerCase().includes(term))?.what ?? m.note ?? undefined,
              href: `/money?q=${q}`,
            })),
          },
          {
            name: "Companies",
            icon: Building2,
            total: companies.length,
            seeAll: `/companies?q=${q}`,
            hits: companies.map((e) => ({ key: e.id, title: employmentLabel(e), href: `/companies?q=${q}` })),
          },
        ].filter((group) => group.total > 0);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground"
        aria-label="Search everything"
      >
        <Search className="size-4" />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden rounded border bg-muted px-1 font-sans text-[10px] md:inline">Ctrl K</kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search everything"
        description="Search your work log, planner, money and companies"
      >
        {/* The pages do the matching, so cmdk must not filter their results again. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search work log, planner, money, companies…"
          />
          <CommandList>
            {debounced.length < 2 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Type at least 2 letters.</p>
            ) : (
              <CommandEmpty>{isFetching ? "Searching…" : `Nothing found for “${debounced}”.`}</CommandEmpty>
            )}
            {groups.map((group) => (
              <CommandGroup key={group.name} heading={`${group.name} (${group.total})`}>
                {group.hits.slice(0, PER_GROUP).map((hit) => (
                  <CommandItem key={hit.key} value={`${group.name}:${hit.key}`} onSelect={() => go(hit.href)}>
                    <group.icon className="size-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate">{hit.title}</p>
                      {hit.detail && <p className="truncate text-xs text-muted-foreground">{hit.detail}</p>}
                    </div>
                  </CommandItem>
                ))}
                {group.total > PER_GROUP && (
                  <CommandItem value={`${group.name}:all`} onSelect={() => go(group.seeAll)}>
                    <Search className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      See all {group.total} in {group.name}
                    </span>
                  </CommandItem>
                )}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
