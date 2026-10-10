import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { loadAccountSnapshot } from "@/lib/chat-context";
import { chatTools } from "@/lib/chat-tools";

// A long answer over a big account can take a while to finish streaming.
export const maxDuration = 300;

// Reads ANTHROPIC_API_KEY from the environment; only ever runs on the server.
const client = new Anthropic();

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      })
    )
    .min(1)
    .max(40)
    .refine((messages) => messages[messages.length - 1].role === "user", "Last message must be the question"),
  // The browser's own idea of today, so "this month" means the user's month.
  today: z.string().max(80),
  timeZone: z.string().max(80),
});

const INSTRUCTIONS = `You are the assistant inside TULSI, a personal app where the user logs their daily work reports, plans to-dos, records the companies they have worked for (with pay history) and tracks money they received and where it went.

Below is everything in the user's account. Answer their questions from it: count, total, compare, summarise, find things, spot patterns. Amounts are Indian rupees (₹). A field that is missing from a record is empty, or false for a yes/no field. Timestamps such as doneAt are UTC; convert them to the user's time zone when you mention a time.

If the data does not hold the answer, say so plainly rather than guessing.

You can also make four kinds of change with your tools: add a money entry (money received, optionally with its spends), add spends (they go on the latest money entry), add a planner to-do, and mark a to-do done. When a request is clear, do it straight away, then confirm in one line what you did, with the amount and date. When something you need is missing or ambiguous — no amount, or several to-dos that could be meant — ask one short question instead. Never invent an amount, date, name or category the user did not give or clearly imply. Give tools dates as yyyy-MM-dd, working out "today", "yesterday" and the like from today's date below. If a tool reports an error, tell the user plainly what did not happen.

You cannot edit or delete anything, or change anything else. If asked to, tell the user where in the app to do it: the Money, Planner, Work log, Companies or Settings page.

Keep answers short and direct, with the number or the fact first. Write plain text: no markdown headings, bold or tables. Simple lines starting with "- " are fine for lists.`;

export async function POST(request: Request) {
  const userId = await requireUserId();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid chat request" }, { status: 400 });
  }
  const { messages, today, timeZone } = parsed.data;
  const snapshot = await loadAccountSnapshot(userId);

  const abort = new AbortController();
  // Runs the model, then any tools it calls, then the model again, until it answers.
  const runner = client.beta.messages.toolRunner(
    {
      model: "claude-opus-5-5",
      max_tokens: 64000,
      output_config: { effort: "medium" },
      // On a safety decline, the API re-runs the question on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Tools render ahead of the system prompt and never change, so the cached prefix holds.
      tools: chatTools(userId),
      system: [
        { type: "text", text: INSTRUCTIONS },
        // The account is the big, stable part — cached so follow-up questions are cheap.
        { type: "text", text: snapshot, cache_control: { type: "ephemeral" } },
        { type: "text", text: `Today is ${today}. The user's time zone is ${timeZone}.` },
      ],
      messages,
      // A chat request needs a step or two; this only stops a runaway loop.
      max_iterations: 8,
      stream: true,
    },
    { signal: abort.signal }
  );

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        let wrote = false;
        let last: Anthropic.Beta.BetaMessage | undefined;
        // One stream per model turn; the runner runs the tools between turns.
        for await (const stream of runner) {
          for await (const event of stream) {
            // Text from a later turn starts on its own paragraph.
            if (event.type === "content_block_start" && event.content_block.type === "text" && wrote) {
              write("\n\n");
            } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              write(event.delta.text);
              wrote = true;
            }
          }
          last = await stream.finalMessage();
        }
        if (last?.stop_reason === "refusal") {
          write("Sorry, I can't help with that one.");
        } else if (last?.stop_reason === "max_tokens") {
          write("\n\n(The answer was cut short — try a narrower question.)");
        } else if (last?.stop_reason === "tool_use") {
          write("\n\n(I stopped partway through — check the app for what was saved.)");
        }
      } catch (error) {
        console.error("Chat request failed", error);
        const message =
          error instanceof Anthropic.AuthenticationError
            ? "The AI key is missing or invalid — check ANTHROPIC_API_KEY."
            : error instanceof Anthropic.RateLimitError
              ? "The AI is busy right now — try again in a minute."
              : "Something went wrong talking to the AI — try again.";
        write(`\n\n${message}`);
      } finally {
        controller.close();
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
