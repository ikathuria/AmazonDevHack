// What the board shows, as plain data. Ported from the reference /board page (apps/server/src/board-page.ts)
// and docs/04-tv-handoff.md §3, so the TV and the browser board always agree.
import type {BoardState, Weekday} from '../api/types';
import {WEEKDAYS, mondayOf, type LocalNow} from './time';

export type Cancellation = {title: string; reason: string};
export type Cancellations = Partial<Record<Weekday, Cancellation>>;

export type RowKind = 'default' | 'now' | 'cancelled' | 'past';
export type RowTone = 'plain' | 'ok' | 'alert';
export type BoardRow = {key: string; day: Weekday; dinner: string; status: string; kind: RowKind; tone: RowTone};

export const MAX_ROWS = 5; // more would run under the controls and the ticker

const up = (s: string) => s.toUpperCase();

function rowStatus(
  state: BoardState,
  cancellations: Cancellations,
  day: Weekday,
  isToday: boolean,
): Pick<BoardRow, 'status' | 'kind' | 'tone'> {
  const p = state.plan;
  if (!p || p.status !== 'ready') {
    return {status: p?.status === 'drafting' ? 'PLANNING…' : '—', kind: 'default', tone: 'plain'};
  }
  if (cancellations[day]) {
    return {status: 'REROUTED', kind: isToday ? 'now' : 'default', tone: 'plain'};
  }
  if (isToday) {
    const c = state.cook;
    const tonight = p.days[day];
    if (c?.recipe && tonight && c.recipe.title === tonight.title) {
      return {
        status: `NOW COOKING · STEP ${c.session.stepIndex + 1}/${c.recipe.steps.length}`,
        kind: 'now',
        tone: 'plain',
      };
    }
    return {status: 'BOARDING TONIGHT', kind: 'now', tone: 'plain'};
  }
  return {status: 'ON TIME', kind: 'default', tone: 'ok'};
}

// Today through Sunday. A cancelled dinner sits, struck through, above that day's rerouted row.
export function buildRows(state: BoardState, cancellations: Cancellations, local: LocalNow): BoardRow[] {
  const p = state.plan;
  const t = WEEKDAYS.indexOf(local.weekday);
  const stale = !!p && p.status === 'ready' && p.weekOf !== mondayOf(local);
  const rows: BoardRow[] = [];
  for (let i = t; i < 7; i++) {
    const day = WEEKDAYS[i];
    const cancelled = cancellations[day];
    if (cancelled) {
      rows.push({
        key: `x-${day}`,
        day,
        dinner: up(cancelled.title),
        status: 'CANCELLED · ALLERGY',
        kind: 'cancelled',
        tone: 'alert',
      });
    }
    const planned = p?.days[day];
    const dinner = stale ? "LAST WEEK'S PLAN" : planned ? up(planned.title) : p?.status === 'drafting' ? '' : 'OPEN';
    const s = stale
      ? {status: 'ASK FOR A NEW PLAN', kind: 'past' as const, tone: 'plain' as const}
      : rowStatus(state, cancellations, day, i === t);
    rows.push({key: `d-${day}`, day, dinner, ...s});
  }
  return fitRows(rows, local.weekday, cancellations);
}

// Keep the board to MAX_ROWS without hiding what matters: tonight's row and every cancelled + rerouted pair stay,
// and the furthest-out ordinary days go first. (A plain cut would drop Friday's safe replacement on a Monday.)
function fitRows(rows: BoardRow[], today: Weekday, cancellations: Cancellations): BoardRow[] {
  const keep = (r: BoardRow) => r.day === today || !!cancellations[r.day];
  const out = [...rows];
  for (let i = out.length - 1; i >= 0 && out.length > MAX_ROWS; i--) {
    if (!keep(out[i])) {
      out.splice(i, 1);
    }
  }
  return out.slice(0, MAX_ROWS);
}

export type Hero = {label: string; name: string} | null;

// Tonight's dishes person, the board's big amber name ("DISHES · GATE SINK / PRIYA").
export function buildHero(state: BoardState, local: LocalNow): Hero {
  const a = state.choreAssignments.find((x) => x.day === local.weekday && x.choreId === 'dishes');
  if (!a) {
    return null;
  }
  const name = state.household.members.find((m) => m.id === a.memberId)?.name ?? a.memberId;
  return {label: `DISHES · GATE SINK${a.done ? ' · DONE' : ''}`, name: up(name)};
}

export function shoppingLine(state: BoardState): {items: string; more: number} | null {
  const open = state.shopping.filter((i) => !i.checked);
  if (!open.length) {
    return null;
  }
  return {
    items: up(
      open
        .slice(0, 4)
        .map((i) => i.name)
        .join(' · '),
    ),
    more: Math.max(0, open.length - 4),
  };
}

export type CookView = {label: string; step: string} | null;

export function buildCook(state: BoardState): CookView {
  const c = state.cook;
  if (!c?.recipe) {
    return null;
  }
  const steps = c.recipe.steps;
  const i = Math.min(c.session.stepIndex, steps.length - 1);
  return {
    label: `NOW COOKING · ${up(c.recipe.title)} · STEP ${i + 1}/${steps.length}`,
    step: steps[i]?.text ?? '',
  };
}

export function title(state: BoardState | null): string {
  return `${up(state?.household.name ?? 'Homebase')} · DINNER DEPARTURES`;
}
