"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { RotateCcw, SendHorizontal, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRefresh } from "@/hooks/use-refresh";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// One click away from a useful first question.
const STARTERS = [
  "How did my work go this week?",
  "How many days did I work last month?",
  "How much have I saved this year?",
  "What's still open on my planner?",
];

// These write to your data, so a click fills the box for you to finish and send.
const ACTION_STARTERS = ["Add ₹500 food spend today", "Add a to-do for tomorrow: "];

// The assistant in the corner of every page: a round button that opens a small
// chat card above it. It answers from everything in your account and can add
// money entries, spends and to-dos; the conversation lives only in this tab and
// clears on reload.
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const refresh = useRefresh();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;

    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setBusy(true);

    // Each chunk lands on the reply being written, the last message.
    const append = (chunk: string) =>
      setMessages((current) => {
        const last = current[current.length - 1];
        return [...current.slice(0, -1), { ...last, content: last.content + chunk }];
      });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The server keeps a cap on history, so only the recent turns go.
          messages: history.slice(-40),
          today: format(new Date(), "EEEE, d MMMM yyyy, h:mm a"),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!response.ok || !response.body) throw new Error(`Chat failed (${response.status})`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        append(decoder.decode(value, { stream: true }));
      }
    } catch {
      append("Couldn't reach the AI — check your connection and try again.");
    } finally {
      setBusy(false);
      // The reply may have added something, so the pages behind refetch what it can touch.
      refresh("salaryEntry", "dayPlan");
    }
  };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Assistant"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="fixed right-5 bottom-20 z-50 flex h-[min(36rem,calc(100dvh-7rem))] w-[min(26rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
        >
          <div className="flex items-center gap-2 bg-zinc-900 px-4 py-3 text-zinc-50 dark:bg-zinc-800">
            <Sparkles className="size-4" />
            <p className="flex-1 text-sm font-semibold">Assistant</p>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                disabled={busy}
                title="New conversation"
                className="rounded-md p-1 text-zinc-400 transition-colors hover:text-zinc-50 disabled:opacity-50"
              >
                <RotateCcw className="size-4" />
                <span className="sr-only">New conversation</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Close"
              className="rounded-md p-1 text-zinc-400 transition-colors hover:text-zinc-50"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ask about your work log, planner, companies or money — or have it add a money entry, a spend or a to-do.
                </p>
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => ask(starter)}
                      className="rounded-full border px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                    >
                      {starter}
                    </button>
                  ))}
                  {ACTION_STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => {
                        setDraft(starter);
                        inputRef.current?.focus();
                      }}
                      className="rounded-full border border-dashed px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-fit max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    message.role === "user"
                      ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-muted"
                  )}
                >
                  {message.content ||
                    (busy && index === messages.length - 1 ? (
                      <span className="text-muted-foreground">Thinking…</span>
                    ) : null)}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <form
            className="flex items-center gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
          >
            <Input
              ref={inputRef}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask, or add something…"
              maxLength={8000}
              aria-label="Your question"
              className="h-10 flex-1 rounded-full px-4"
            />
            <Button
              type="submit"
              size="icon-lg"
              disabled={busy || !draft.trim()}
              className="size-10 shrink-0 rounded-full"
            >
              <SendHorizontal className="size-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      )}

      <Button
        size="icon-lg"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        title={open ? "Close assistant" : "Ask AI about your data"}
        className="fixed right-5 bottom-5 z-50 size-12 rounded-full shadow-lg"
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
        <span className="sr-only">{open ? "Close assistant" : "Ask AI about your data"}</span>
      </Button>
    </>
  );
}
