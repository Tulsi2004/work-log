import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

// How far ahead a to-do still counts as "coming up" — beyond this it is too far
// off to be worth nagging about in the navbar.
const DEFAULT_UPCOMING_DAYS = 7;

// Plan dates are stored as UTC midnight of the day they were picked, so the
// window has to be built in UTC too. The client passes its own local "today"
// (yyyy-MM-dd) so the badge follows the user's day, not the server's.
function utcDay(day: string): Date {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T00:00:00.000Z`) : new Date(NaN);
  // Falling back to the server's day is only ever off by the timezone gap.
  return Number.isNaN(date.getTime())
    ? new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
    : date;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  const params = request.nextUrl.searchParams;

  const today = utcDay(params.get("today")?.trim() ?? "");
  const days = Number(params.get("days")) || DEFAULT_UPCOMING_DAYS;

  const tomorrow = addDays(today, 1);
  const horizon = addDays(today, days + 1);

  const [due, upcoming] = await Promise.all([
    // Today's to-dos plus anything still open from a past day.
    prisma.dayPlan.count({ where: { userId, isDone: false, date: { lt: tomorrow } } }),
    prisma.dayPlan.count({ where: { userId, isDone: false, date: { gte: tomorrow, lt: horizon } } }),
  ]);

  return NextResponse.json({ due, upcoming });
}
