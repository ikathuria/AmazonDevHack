// Day/week helpers in the household's timezone. Weeks start on Monday.
import type { Weekday } from "./contracts.js";

export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_NAMES: Record<Weekday, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

function localParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), wd: get("weekday").toLowerCase().slice(0, 3) as Weekday };
}

export function today(now: Date, timezone: string): Weekday {
  return localParts(now, timezone).wd;
}

// ISO date (YYYY-MM-DD) of the Monday of the current week in the household's timezone.
export function weekOf(now: Date, timezone: string): string {
  const { y, m, d, wd } = localParts(now, timezone);
  const monday = new Date(Date.UTC(y, m - 1, d - WEEKDAYS.indexOf(wd)));
  return monday.toISOString().slice(0, 10);
}

export function parseDay(input: string | undefined, now: Date, timezone: string): Weekday {
  if (!input) return today(now, timezone);
  const s = input.trim().toLowerCase();
  if (s === "today" || s === "tonight") return today(now, timezone);
  if (s === "tomorrow") return WEEKDAYS[(WEEKDAYS.indexOf(today(now, timezone)) + 1) % 7];
  const hit = WEEKDAYS.find((w) => s.startsWith(w));
  return hit ?? today(now, timezone);
}
