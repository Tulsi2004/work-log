"use client";

import { useSyncExternalStore } from "react";

// Chrome, Edge and Android fire `beforeinstallprompt` once, early, when the site
// can be installed — usually before the Settings page is open — so the event is
// caught here as soon as this module loads (the navbar imports it) and kept for
// the Install button. Safari never fires it; iPhones install from the Share menu.
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Hold it for our own button rather than the browser's pop-up.
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Opens the browser's install dialog, or undefined when the browser has not offered one. */
export function useInstallPrompt(): (() => Promise<void>) | undefined {
  const event = useSyncExternalStore(subscribe, () => deferred, () => null);
  if (!event) return undefined;
  return async () => {
    await event.prompt();
    // The event can only be used once, whatever the answer.
    deferred = null;
    notify();
  };
}
