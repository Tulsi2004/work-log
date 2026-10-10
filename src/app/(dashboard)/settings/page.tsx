"use client";

import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2, DatabaseBackup, Download, FileSpreadsheet, Monitor, Moon, Sun } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useInstallPrompt } from "@/lib/install-prompt";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

interface ExportFile {
  url: string;
  label: string;
  // What is in the file, for the "are you sure" question.
  holds: string;
}

const FULL_BACKUP: ExportFile = {
  url: "/api/export?format=json",
  label: "full backup",
  holds: "everything in your account",
};

// Each section of /api/export's CSV output — one file per thing, so each opens
// in Excel as a single sheet.
const CSV_EXPORTS: ExportFile[] = [
  { url: "/api/export?format=csv&what=work-reports", label: "Work log", holds: "every work report" },
  { url: "/api/export?format=csv&what=money", label: "Money", holds: "every money entry and what it went on" },
  { url: "/api/export?format=csv&what=planner", label: "Planner", holds: "every to-do" },
  { url: "/api/export?format=csv&what=companies", label: "Companies", holds: "every company and its pay" },
];

// Read once from the browser; nothing to subscribe to.
const subscribeNever = () => () => {};

function InstallCard() {
  const install = useInstallPrompt();
  const installed = useSyncExternalStore(
    subscribeNever,
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false
  );
  const isIos = useSyncExternalStore(subscribeNever, () => /iPhone|iPad|iPod/.test(navigator.userAgent), () => false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install the app</CardTitle>
        <CardDescription>
          Put TULSI on your phone&apos;s home screen or your computer&apos;s app list. It opens in its own
          window and updates itself — no app store needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {installed ? (
          <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4" /> You&apos;re using the installed app.
          </p>
        ) : install ? (
          <Button type="button" onClick={install}>
            <Download className="size-4" />
            Install TULSI
          </Button>
        ) : isIos ? (
          <p className="text-muted-foreground">
            Open this page in <span className="font-medium text-foreground">Safari</span>, tap{" "}
            <span className="font-medium text-foreground">Share</span>, then{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span>.
          </p>
        ) : (
          // The browser has not offered an install here (some browsers never do,
          // and it waits until the site is live) — so say where it lives.
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Android:</span> Chrome menu ⋮ → Install app
            </li>
            <li>
              <span className="font-medium text-foreground">iPhone:</span> Safari → Share → Add to Home Screen
            </li>
            <li>
              <span className="font-medium text-foreground">Computer:</span> Chrome or Edge → the install icon at
              the right of the address bar
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  // The file waiting on "are you sure" — a backup is everything in plain text.
  // Kept after closing, so the dialog does not go blank while it fades out.
  const [pending, setPending] = useState<ExportFile>(FULL_BACKUP);
  const [confirming, setConfirming] = useState(false);
  const ask = (file: ExportFile) => {
    setPending(file);
    setConfirming(true);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your appearance and account preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how TULSI looks on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant={theme === option.value ? "default" : "outline"}
                  className={cn("flex-1")}
                  onClick={() => setTheme(option.value)}
                >
                  <Icon className="size-4" />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <InstallCard />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your profile details, managed by Clerk.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? "User"} />
              <AvatarFallback>{user?.firstName?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user?.fullName ?? "—"}</p>
              <p className="text-sm text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress ?? "—"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Use the profile menu in the top right to update your name, email or password.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export & backup</CardTitle>
          <CardDescription>Download a copy of your data to keep or to open in Excel.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <DatabaseBackup className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Full backup</p>
                <p className="text-sm text-muted-foreground">
                  Everything in one JSON file — work log, planner, money, companies and settings.
                </p>
              </div>
            </div>
            <Button type="button" onClick={() => ask(FULL_BACKUP)} className="shrink-0">
              <Download className="size-4" />
              Download backup
            </Button>
          </div>

          <div className="space-y-3 pt-4">
            <div className="flex gap-3">
              <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Excel files (CSV)</p>
                <p className="text-sm text-muted-foreground">One file per section, ready to open in Excel.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:pl-8">
              {CSV_EXPORTS.map((file) => (
                <Button key={file.url} type="button" variant="outline" size="sm" onClick={() => ask(file)}>
                  <Download className="size-3.5" />
                  {file.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={pending === FULL_BACKUP ? "Download your full backup?" : `Download ${pending.label} as an Excel file?`}
        description={`This saves a file with ${pending.holds} to this device. Anyone you share it with can read it, so keep it somewhere safe.`}
        confirmLabel="Download"
        destructive={false}
        onConfirm={() => {
          // The route answers as an attachment, so this downloads without leaving the page.
          window.location.assign(pending.url);
          setConfirming(false);
        }}
      />
    </div>
  );
}
