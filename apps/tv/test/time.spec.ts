import {clockLabel, countdownLabel, localNow, mondayOf} from '../src/logic/time';
import {MONDAY_EVENING_UTC, SAT} from './fixtures';

describe('household time', () => {
  it('uses the household timezone, not the device clock (the Vega Virtual Device runs on UTC)', () => {
    const l = localNow(MONDAY_EVENING_UTC, 'America/Chicago');
    expect(l).toEqual({weekday: 'mon', y: 2026, m: 10, d: 19, hour: 19, minute: 53});
    expect(localNow(MONDAY_EVENING_UTC, 'UTC').weekday).toBe('tue');
  });

  it('falls back to the device clock for an unknown timezone', () => {
    expect(localNow(MONDAY_EVENING_UTC, 'Not/AZone').y).toBe(2026);
  });

  it("finds this week's Monday, the server's plan.weekOf key", () => {
    expect(mondayOf(localNow(MONDAY_EVENING_UTC, 'America/Chicago'))).toBe('2026-10-19');
    expect(mondayOf(SAT)).toBe('2026-10-19');
    expect(mondayOf({weekday: 'sun', y: 2026, m: 11, d: 1, hour: 9, minute: 0})).toBe('2026-10-26');
  });

  it('formats the clock and the countdown', () => {
    expect(clockLabel({weekday: 'tue', y: 2026, m: 10, d: 20, hour: 7, minute: 5})).toBe('07:05 TUE');
    expect(countdownLabel(10_000 + 896_000, 10_000)).toEqual({text: '14:56', done: false});
    expect(countdownLabel(10_000 + 9_000, 10_000)).toEqual({text: '0:09', done: false});
    expect(countdownLabel(10_000, 20_000)).toEqual({text: "TIME'S UP", done: true});
  });
});
