// Clock and calendar in the household's timezone. The Vega Virtual Device runs on UTC, so the device clock alone
// would put "tonight" on the wrong day every evening in Chicago. Mirrors apps/server/src/lib/time.ts.
import type {Weekday} from '../api/types';

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export type LocalNow = {weekday: Weekday; y: number; m: number; d: number; hour: number; minute: number};

export function localNow(now: Date, timeZone: string): LocalNow {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const weekday = get('weekday').toLowerCase().slice(0, 3) as Weekday;
    if (!WEEKDAYS.includes(weekday)) {
      throw new Error('no weekday');
    }
    return {
      weekday,
      y: Number(get('year')),
      m: Number(get('month')),
      d: Number(get('day')),
      hour: Number(get('hour')) % 24, // some engines print midnight as "24"
      minute: Number(get('minute')),
    };
  } catch {
    // No Intl timezone data: fall back to the device clock.
    return {
      weekday: WEEKDAYS[(now.getDay() + 6) % 7],
      y: now.getFullYear(),
      m: now.getMonth() + 1,
      d: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
    };
  }
}

// ISO date of this week's Monday, the same key the server stores in plan.weekOf.
export function mondayOf(l: LocalNow): string {
  const monday = new Date(Date.UTC(l.y, l.m - 1, l.d - WEEKDAYS.indexOf(l.weekday)));
  return monday.toISOString().slice(0, 10);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function clockLabel(l: LocalNow): string {
  return `${pad(l.hour)}:${pad(l.minute)} ${l.weekday.toUpperCase()}`;
}

export function countdownLabel(endsAtMs: number, nowMs: number): {text: string; done: boolean} {
  const s = Math.max(0, Math.round((endsAtMs - nowMs) / 1000));
  if (s === 0) {
    return {text: "TIME'S UP", done: true};
  }
  return {text: `${Math.floor(s / 60)}:${pad(s % 60)}`, done: false};
}
