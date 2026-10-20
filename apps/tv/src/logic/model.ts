// Board model: the server snapshot plus what the event stream adds on top (cancellations, timer, ticker alerts).
// Pure reducer, so the whole event flow is unit-tested without a device.
import type {BoardState, StoredEvent} from '../api/types';
import type {Cancellations} from './board';

export type Alert = {id: number; text: string};

export type Model = {
  state: BoardState | null;
  cursor: number; // highest event seq applied; the stream resumes from here
  cancellations: Cancellations;
  timerEndsAt: number | null;
  heard: string | null;
  alert: Alert | null; // red ticker (safety only)
  needsRefetch: boolean; // a cook.step for a recipe we don't have the steps for
};

export type Action =
  | {type: 'loaded'; state: BoardState; nowMs: number}
  | {type: 'event'; event: StoredEvent};

export const initialModel: Model = {
  state: null,
  cursor: 0,
  cancellations: {},
  timerEndsAt: null,
  heard: null,
  alert: null,
  needsRefetch: false,
};

const up = (s: string) => s.toUpperCase();

export function reroutedAlert(e: Extract<StoredEvent['event'], {type: 'plan.rerouted'}>): string {
  const who = /and (\w+) is allergic/.exec(e.cancelled.reason)?.[1];
  return (
    `⚠ ${up(e.cancelled.title)} CANCELLED` +
    (who ? ` · ${up(who)} HAS AN ALLERGY` : '') +
    (e.replacement ? ` → REROUTED TO ${up(e.replacement.title)}` : ' · NO SAFE SWAP FOUND')
  );
}

function withAlert(m: Model, text: string): Model {
  return {...m, alert: {id: (m.alert?.id ?? 0) + 1, text}};
}

export function reducer(m: Model, a: Action): Model {
  if (a.type === 'loaded') {
    const ends = a.state.cook?.session.timerEndsAt ? Date.parse(a.state.cook.session.timerEndsAt) : 0;
    return {
      ...m,
      state: a.state,
      // First load starts the stream at the snapshot. A later refetch keeps the cursor: events after it are
      // re-applied idempotently, and transient effects (a cancellation, the ticker) aren't lost.
      cursor: m.state ? m.cursor : a.state.lastSeq,
      timerEndsAt: ends > a.nowMs ? ends : m.timerEndsAt,
      needsRefetch: false,
    };
  }

  const {seq, event: ev} = a.event;
  if (!m.state || seq <= m.cursor) {
    return m; // duplicate after a reconnect, or arrived before the snapshot
  }
  const s = m.state;
  const next: Model = {...m, cursor: seq};

  switch (ev.type) {
    case 'plan.updated': {
      const fresh = s.plan?.status === 'drafting' && ev.plan.status === 'ready';
      const cancellations = ev.plan.status === 'drafting' ? {} : m.cancellations;
      const updated = {...next, cancellations, state: {...s, plan: ev.plan}};
      if (fresh && ev.plan.blocked.length) {
        return withAlert(
          updated,
          '⚠ ' + ev.plan.blocked.map((b) => `SKIPPED ${up(b.title)} · ${up(b.reason)}`).join('   ·   '),
        );
      }
      return updated;
    }
    case 'plan.rerouted':
      return withAlert({...next, cancellations: {...m.cancellations, [ev.day]: ev.cancelled}}, reroutedAlert(ev));
    case 'chores.updated':
      return {...next, state: {...s, choreAssignments: ev.assignments}};
    case 'household.updated':
      return {...next, state: {...s, household: ev.household}};
    case 'shopping.updated':
      return {...next, state: {...s, shopping: ev.items}};
    case 'cook.step': {
      // A timer still running carries over to the next step; one that already rang (TIME'S UP) is cleared.
      const timerEndsAt = m.timerEndsAt && m.timerEndsAt > Date.parse(a.event.at) ? m.timerEndsAt : null;
      // Same recipe: move to the new step right away. New recipe: we need its title and steps, so refetch.
      if (s.cook?.recipe && s.cook.session.recipeId === ev.session.recipeId) {
        return {
          ...next,
          timerEndsAt,
          state: {...s, cook: {...s.cook, session: {...s.cook.session, ...ev.session}}},
        };
      }
      return {...next, timerEndsAt, needsRefetch: true};
    }
    case 'cook.timer':
      return {...next, timerEndsAt: Date.parse(ev.endsAt)};
    case 'voice.heard':
      return {...next, heard: ev.utterance};
    default:
      return next; // unknown event types from newer servers are ignored
  }
}
