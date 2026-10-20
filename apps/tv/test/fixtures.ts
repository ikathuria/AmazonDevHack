// A Patels household snapshot shaped like GET /households/patels/state (docs/04-tv-handoff.md §4.1).
import type {BoardState} from '../src/api/types';
import type {LocalNow} from '../src/logic/time';

// Monday 19 Oct 2026, 19:53 in Chicago (00:53 UTC on Tuesday, which is what the Vega Virtual Device clock says).
export const MONDAY_EVENING_UTC = new Date('2026-10-20T00:53:00Z');
export const MON: LocalNow = {weekday: 'mon', y: 2026, m: 10, d: 19, hour: 19, minute: 53};
export const SAT: LocalNow = {weekday: 'sat', y: 2026, m: 10, d: 24, hour: 18, minute: 0};

export function patels(overrides: Partial<BoardState> = {}): BoardState {
  return {
    household: {
      id: 'patels',
      name: 'The Patels',
      timezone: 'America/Chicago',
      dayRules: {tue: 'vegetarian'},
      members: [
        {id: 'priya', name: 'Priya', role: 'adult', allergies: [], diets: [], dislikes: []},
        {id: 'arjun', name: 'Arjun', role: 'adult', allergies: [], diets: [], dislikes: []},
        {id: 'maya', name: 'Maya', role: 'child', allergies: ['peanut'], diets: [], dislikes: []},
      ],
    },
    plan: {
      weekOf: '2026-10-19',
      status: 'ready',
      days: {
        mon: {recipeId: 'chana-masala', title: 'Chana masala'},
        tue: {recipeId: 'dal-tadka', title: 'Dal tadka'},
        wed: {recipeId: 'egg-fried-rice', title: 'Egg fried rice'},
        thu: {recipeId: 'sheet-pan-tikka', title: 'Sheet-pan chicken tikka'},
        fri: {recipeId: 'garlic-spinach-pasta', title: 'Garlic spinach pasta'},
        sat: {recipeId: 'frittata', title: 'Potato and spinach frittata'},
        sun: {recipeId: 'lentil-soup', title: 'Red lentil soup'},
      },
      blocked: [],
    },
    chores: [{id: 'dishes', name: 'dishes', effort: 2, frequency: 'daily'}],
    choreAssignments: [
      {choreId: 'cook', memberId: 'arjun', day: 'mon', done: false},
      {choreId: 'dishes', memberId: 'priya', day: 'mon', done: false},
    ],
    cook: null,
    shopping: [
      {name: 'cilantro', checked: false},
      {name: 'limes', checked: true},
    ],
    lastSeq: 100,
    ...overrides,
  };
}

export const chanaCooking = (stepIndex = 0): BoardState['cook'] => ({
  session: {recipeId: 'chana-masala', stepIndex},
  recipe: {
    title: 'Chana masala',
    steps: [
      {text: 'Rinse the rice and start it cooking.', timerSec: 900},
      {text: 'Dice the onion and fry it in oil until golden.'},
      {text: 'Add the spices and tomatoes.'},
    ],
  },
});
