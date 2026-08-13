"use client";

import Link from "next/link";
import { ClipboardList, Settings } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ClipboardList className="size-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">Worklog</span>
      </Link>

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
