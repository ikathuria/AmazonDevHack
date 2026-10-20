import {buildCook, buildHero, buildRows, MAX_ROWS, shoppingLine, title} from '../src/logic/board';
import {chanaCooking, MON, patels, SAT} from './fixtures';

describe('board rows', () => {
  it('shows today through the next days, tonight lit, the rest on time (max 5 rows)', () => {
    const rows = buildRows(patels(), {}, MON);
    expect(rows).toHaveLength(MAX_ROWS);
    expect(rows[0]).toEqual({
      key: 'd-mon',
      day: 'mon',
      dinner: 'CHANA MASALA',
      status: 'BOARDING TONIGHT',
      kind: 'now',
      tone: 'plain',
    });
    expect(rows[1]).toMatchObject({day: 'tue', dinner: 'DAL TADKA', status: 'ON TIME', kind: 'default', tone: 'ok'});
    expect(rows.map((r) => r.day)).toEqual(['mon', 'tue', 'wed', 'thu', 'fri']);
  });

  it('stops at Sunday', () => {
    expect(buildRows(patels(), {}, SAT).map((r) => r.day)).toEqual(['sat', 'sun']);
  });

  it("shows the cook-along step on tonight's row", () => {
    const rows = buildRows(patels({cook: chanaCooking(1)}), {}, MON);
    expect(rows[0].status).toBe('NOW COOKING · STEP 2/3');
  });

  it('shows PLANNING… while drafting, and OPEN with no plan', () => {
    const drafting = patels({plan: {weekOf: '2026-10-19', status: 'drafting', days: {}, blocked: []}});
    expect(buildRows(drafting, {}, MON)[0]).toMatchObject({dinner: '', status: 'PLANNING…'});
    expect(buildRows(patels({plan: null}), {}, MON)[0]).toMatchObject({dinner: 'OPEN', status: '—'});
  });

  it("marks last week's plan as stale", () => {
    const old = patels({plan: {...patels().plan!, weekOf: '2026-10-12'}});
    expect(buildRows(old, {}, MON)[0]).toMatchObject({
      dinner: "LAST WEEK'S PLAN",
      status: 'ASK FOR A NEW PLAN',
      kind: 'past',
    });
  });

  it('puts a cancelled dinner above the rerouted one, and keeps both within 5 rows', () => {
    const cancellations = {
      fri: {title: 'Peanut satay noodles', reason: 'peanut butter contains peanut and Maya is allergic'},
    };
    // On a Monday, Friday's pair would fall off a plain 5-row cut; the furthest ordinary day (Thursday) goes instead.
    const rows = buildRows(patels(), cancellations, MON);
    expect(rows).toHaveLength(MAX_ROWS);
    expect(rows.map((r) => r.key)).toEqual(['d-mon', 'd-tue', 'd-wed', 'x-fri', 'd-fri']);
    expect(rows[3]).toEqual({
      key: 'x-fri',
      day: 'fri',
      dinner: 'PEANUT SATAY NOODLES',
      status: 'CANCELLED · ALLERGY',
      kind: 'cancelled',
      tone: 'alert',
    });
    expect(rows[4]).toMatchObject({dinner: 'GARLIC SPINACH PASTA', status: 'REROUTED'});
    const fromThu = buildRows(patels(), cancellations, {...MON, weekday: 'thu', d: 22});
    expect(fromThu.map((r) => [r.key, r.status])).toEqual([
      ['d-thu', 'BOARDING TONIGHT'],
      ['x-fri', 'CANCELLED · ALLERGY'],
      ['d-fri', 'REROUTED'],
      ['d-sat', 'ON TIME'],
      ['d-sun', 'ON TIME'],
    ]);
  });
});

describe('lower half', () => {
  it("names tonight's dishes person", () => {
    expect(buildHero(patels(), MON)).toEqual({label: 'DISHES · GATE SINK', name: 'PRIYA'});
    const done = patels({choreAssignments: [{choreId: 'dishes', memberId: 'arjun', day: 'mon', done: true}]});
    expect(buildHero(done, MON)).toEqual({label: 'DISHES · GATE SINK · DONE', name: 'ARJUN'});
    expect(buildHero(patels({choreAssignments: []}), MON)).toBeNull();
  });

  it('lists up to 4 unchecked shopping items', () => {
    expect(shoppingLine(patels())).toEqual({items: 'CILANTRO', more: 0});
    const many = patels({shopping: ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => ({name, checked: false}))});
    expect(shoppingLine(many)).toEqual({items: 'A · B · C · D', more: 2});
    expect(shoppingLine(patels({shopping: []}))).toBeNull();
  });

  it('describes the current cooking step', () => {
    expect(buildCook(patels())).toBeNull();
    expect(buildCook(patels({cook: chanaCooking(1)}))).toEqual({
      label: 'NOW COOKING · CHANA MASALA · STEP 2/3',
      step: 'Dice the onion and fry it in oil until golden.',
    });
  });

  it('titles the board after the household', () => {
    expect(title(patels())).toBe('THE PATELS · DINNER DEPARTURES');
    expect(title(null)).toBe('HOMEBASE · DINNER DEPARTURES');
  });
});
