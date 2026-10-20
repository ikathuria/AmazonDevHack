import type {HomebaseEvent, StoredEvent} from '../src/api/types';
import {initialModel, reducer, reroutedAlert, type Model} from '../src/logic/model';
import {chanaCooking, patels} from './fixtures';

const AT = '2026-10-20T00:53:00.000Z';
const ev = (seq: number, event: HomebaseEvent, at = AT): {type: 'event'; event: StoredEvent} => ({
  type: 'event',
  event: {seq, at, event},
});
const loaded = (overrides = {}): Model =>
  reducer(initialModel, {type: 'loaded', state: patels(overrides), nowMs: Date.parse(AT)});

const rerouted: Extract<HomebaseEvent, {type: 'plan.rerouted'}> = {
  type: 'plan.rerouted',
  day: 'fri',
  cancelled: {title: 'Peanut satay noodles', reason: 'peanut butter contains peanut and Maya is allergic'},
  replacement: {recipeId: 'garlic-spinach-pasta', title: 'Garlic spinach pasta'},
};

describe('board model', () => {
  it('starts the stream cursor at the snapshot', () => {
    expect(loaded().cursor).toBe(100);
  });

  it('ignores events before the snapshot and duplicates after a reconnect', () => {
    const m = loaded();
    const shop = ev(101, {type: 'shopping.updated', items: [{name: 'ginger', checked: false}]});
    const once = reducer(m, shop);
    expect(once.cursor).toBe(101);
    expect(reducer(once, shop)).toBe(once);
    expect(reducer(m, ev(99, {type: 'voice.heard', utterance: 'old'}))).toBe(m);
    expect(reducer(initialModel, shop)).toBe(initialModel);
  });

  it('plays the cancel moment: a cancellation row and the red ticker', () => {
    const m = reducer(loaded(), ev(101, rerouted));
    expect(m.cancellations.fri).toEqual(rerouted.cancelled);
    expect(m.alert).toEqual({
      id: 1,
      text: '⚠ PEANUT SATAY NOODLES CANCELLED · MAYA HAS AN ALLERGY → REROUTED TO GARLIC SPINACH PASTA',
    });
    expect(reroutedAlert({...rerouted, replacement: null, cancelled: {title: 'Satay', reason: 'contains peanut'}})).toBe(
      '⚠ SATAY CANCELLED · NO SAFE SWAP FOUND',
    );
  });

  it('clears cancellations when a new plan starts drafting', () => {
    const cancelled = reducer(loaded(), ev(101, rerouted));
    const drafting = reducer(
      cancelled,
      ev(102, {type: 'plan.updated', plan: {weekOf: '2026-10-19', status: 'drafting', days: {}, blocked: []}}),
    );
    expect(drafting.cancellations).toEqual({});
    expect(drafting.state?.plan?.status).toBe('drafting');
  });

  it('runs the ticker when a fresh plan skipped unsafe dinners', () => {
    const drafting = loaded({plan: {weekOf: '2026-10-19', status: 'drafting', days: {}, blocked: []}});
    const ready = reducer(
      drafting,
      ev(101, {
        type: 'plan.updated',
        plan: {...patels().plan!, blocked: [{title: 'Peanut satay noodles', reason: 'Maya is allergic to peanut'}]},
      }),
    );
    expect(ready.alert?.text).toBe('⚠ SKIPPED PEANUT SATAY NOODLES · MAYA IS ALLERGIC TO PEANUT');
    // An update to an already-ready plan doesn't re-alert.
    expect(reducer(ready, ev(102, {type: 'plan.updated', plan: ready.state!.plan!})).alert?.id).toBe(1);
  });

  it('replaces chores, household and shopping', () => {
    let m = loaded();
    m = reducer(m, ev(101, {type: 'chores.updated', assignments: [{choreId: 'dishes', memberId: 'maya', day: 'mon', done: false}]}));
    m = reducer(m, ev(102, {type: 'household.updated', household: {...m.state!.household, name: 'The Shahs'}}));
    m = reducer(m, ev(103, {type: 'shopping.updated', items: []}));
    expect(m.state?.choreAssignments[0].memberId).toBe('maya');
    expect(m.state?.household.name).toBe('The Shahs');
    expect(m.state?.shopping).toEqual([]);
  });

  it('moves to the next step in place, and refetches for a different recipe', () => {
    const cooking = loaded({cook: chanaCooking(0)});
    const step = reducer(
      cooking,
      ev(101, {type: 'cook.step', session: {recipeId: 'chana-masala', stepIndex: 1}, step: {text: 'Dice'}, total: 3}),
    );
    expect(step.state?.cook?.session.stepIndex).toBe(1);
    expect(step.needsRefetch).toBe(false);
    const other = reducer(
      cooking,
      ev(102, {type: 'cook.step', session: {recipeId: 'dal-tadka', stepIndex: 0}, step: {text: 'Rinse'}, total: 4}),
    );
    expect(other.needsRefetch).toBe(true);
    expect(reducer(other, {type: 'loaded', state: patels(), nowMs: 0}).needsRefetch).toBe(false);
  });

  it('keeps the cursor and the cancel moment across a refetch', () => {
    const m = reducer(loaded(), ev(105, rerouted));
    const again = reducer(m, {type: 'loaded', state: patels({lastSeq: 103}), nowMs: 0});
    expect(again.cursor).toBe(105);
    expect(again.cancellations.fri).toBeDefined();
  });

  it('starts timers from events and from the snapshot, and clears a rung timer on the next step', () => {
    const endsAt = '2026-10-20T01:08:00.000Z';
    const m = reducer(loaded({cook: chanaCooking(0)}), ev(101, {type: 'cook.timer', endsAt, label: 'Chana masala, step 1'}));
    expect(m.timerEndsAt).toBe(Date.parse(endsAt));
    const running = {...chanaCooking(0)!, session: {recipeId: 'chana-masala', stepIndex: 0, timerEndsAt: endsAt}};
    expect(loaded({cook: running}).timerEndsAt).toBe(Date.parse(endsAt));
    const stepWhileRunning = ev(102, {type: 'cook.step', session: {recipeId: 'chana-masala', stepIndex: 1}, step: {text: 'x'}, total: 3});
    expect(reducer(m, stepWhileRunning).timerEndsAt).toBe(Date.parse(endsAt));
    const late = {...stepWhileRunning, event: {...stepWhileRunning.event, at: '2026-10-20T01:20:00.000Z'}};
    expect(reducer(m, late).timerEndsAt).toBeNull();
  });

  it('remembers what Alexa heard and ignores unknown events', () => {
    const m = reducer(loaded(), ev(101, {type: 'voice.heard', utterance: 'plan dinners this week'}));
    expect(m.heard).toBe('plan dinners this week');
    const unknown = reducer(m, ev(102, {type: 'pantry.updated'} as unknown as HomebaseEvent));
    expect(unknown.cursor).toBe(102);
    expect(unknown.state).toBe(m.state);
  });
});
