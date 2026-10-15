import type { Occurrence } from "./recurrence";
import type { Jsonify } from "./types";

/** fetch wrapper: JSON in/out, throws Error(message) from `{ error }` responses. */
export async function api<T>(url: string, init: Omit<RequestInit, "body"> & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: json === undefined ? rest.headers : { "Content-Type": "application/json", ...rest.headers },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  if (res.status === 401) {
    window.location.href = "/sign-in";
    throw new Error("Signed out");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export const reviveOccurrence = (o: Jsonify<Occurrence>): Occurrence => ({
  ...o,
  start: new Date(o.start),
  end: new Date(o.end),
  originalStart: o.originalStart ? new Date(o.originalStart) : null,
});
