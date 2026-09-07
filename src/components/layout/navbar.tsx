"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, ClipboardList, Settings } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TulsiLogo } from "./tulsi-logo";
import { ThemeToggle } from "./theme-toggle";

const NAV_LINKS = [
  { href: "/", label: "Work log", icon: ClipboardList },
  { href: "/planner", label: "Planner", icon: CalendarCheck },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <Link href="/" className="flex items-center gap-2">
        <TulsiLogo className="size-7" />
        <span className="text-sm font-semibold tracking-widest">TULSI</span>
      </Link>

      <nav className="ml-3 flex items-center gap-1">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Button
            key={href}
            variant="ghost"
            size="sm"
            asChild
            className={cn(pathname === href && "bg-accent text-accent-foreground")}
          >
            <Link href={href}>
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          </Button>
        ))}
      </nav>

      <div className="flex-1" />

      <ThemeToggle />

      <Button variant="ghost" size="icon" asChild>
        <Link href="/settings">
          <Settings className="size-4" />
          <span className="sr-only">Settings</span>
        </Link>
      </Button>

      <UserButton />
    </header>
  );
}
