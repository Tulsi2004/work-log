import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { loadAccountSnapshot } from "@/lib/chat-context";

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

If the data does not hold the answer, say so plainly rather than guessing. You cannot change anything in the app — if asked to, tell the user where in the app they can do it.

Keep answers short and direct, with the number or the fact first. Write plain text: no markdown headings, bold or tables. Simple lines starting with "- " are fine for lists.`;

export async function POST(request: Request) {
  const userId = await requireUserId();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid chat request" }, { status: 400 });
  }
  const { messages, today, timeZone } = parsed.data;
  const snapshot = await loadAccountSnapshot(userId);

  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 64000,
    output_config: { effort: "medium" },
    // On a safety decline, the API re-runs the question on Anthropic's recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: INSTRUCTIONS },
      // The account is the big, stable part — cached so follow-up questions are cheap.
      { type: "text", text: snapshot, cache_control: { type: "ephemeral" } },
      { type: "text", text: `Today is ${today}. The user's time zone is ${timeZone}.` },
    ],
    messages,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("Sorry, I can't help with that one."));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n(The answer was cut short — try a narrower question.)"));
        }
      } catch (error) {
        console.error("Chat request failed", error);
        const message =
          error instanceof Anthropic.AuthenticationError
            ? "The AI key is missing or invalid — check ANTHROPIC_API_KEY."
            : error instanceof Anthropic.RateLimitError
              ? "The AI is busy right now — try again in a minute."
              : "Something went wrong talking to the AI — try again.";
        controller.enqueue(encoder.encode(`\n\n${message}`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
