import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function errorResponse(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError)
    return Response.json(
      { error: e.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ") },
      { status: 400 },
    );
  console.error(e);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

const toResponse = (result: unknown) => (result instanceof Response ? result : Response.json(result ?? { ok: true }));

/** Route handler wrapper: authenticates, maps errors to `{ error }` JSON with a status. */
export function handler<P = Record<string, never>>(
  fn: (ctx: { req: Request; userId: string; params: P }) => Promise<unknown>,
) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      const { userId } = await auth();
      if (!userId) throw new HttpError(401, "Not signed in");
      return toResponse(await fn({ req, userId, params: await ctx.params }));
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export async function ownedCalendar(userId: string, calendarId: string, opts: { writable?: boolean } = {}) {
  const cal = await prisma.calendar.findFirst({ where: { id: calendarId, userId } });
  if (!cal) throw new HttpError(404, "Calendar not found");
  if (opts.writable && cal.isReadOnly) throw new HttpError(403, "This calendar is read-only");
  return cal;
}
