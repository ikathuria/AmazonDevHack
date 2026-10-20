// Shapes the TV reads from the Homebase server. Copied from packages/contracts/src/index.ts (the zod source of truth);
// the TV only needs the TypeScript types, so it doesn't bundle zod. Keep in sync when contracts change.
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type Member = {
  id: string;
  name: string;
  role: 'adult' | 'teen' | 'child';
  allergies: string[];
  diets: string[];
  dislikes: string[];
};

export type Household = {
  id: string;
  name: string;
  members: Member[];
  dayRules: Partial<Record<Weekday, string>>;
  timezone: string;
};

export type MealPlan = {
  weekOf: string;
  status: 'drafting' | 'ready' | 'failed';
  days: Partial<Record<Weekday, {recipeId: string; title: string}>>;
  blocked: {title: string; reason: string}[];
};

export type Chore = {id: string; name: string; effort: number; frequency: 'daily' | 'weekly'};
export type ChoreAssignment = {choreId: string; memberId: string; day: Weekday; done: boolean};
export type RecipeStep = {text: string; timerSec?: number};
export type CookSession = {recipeId: string; stepIndex: number; timerEndsAt?: string};
export type ShoppingItem = {name: string; quantity?: string; checked: boolean};

// GET /households/:id/state
export type BoardState = {
  household: Household;
  plan: MealPlan | null;
  chores: Chore[];
  choreAssignments: ChoreAssignment[];
  cook: {session: CookSession; recipe?: {id?: string; title: string; steps: RecipeStep[]}} | null;
  shopping: ShoppingItem[];
  lastSeq: number;
};

export type HomebaseEvent =
  | {type: 'household.updated'; household: Household}
  | {type: 'plan.updated'; plan: MealPlan}
  | {type: 'chores.updated'; assignments: ChoreAssignment[]}
  | {type: 'cook.step'; session: CookSession; step: RecipeStep; total: number}
  | {type: 'cook.timer'; endsAt: string; label: string}
  | {type: 'shopping.updated'; items: ShoppingItem[]}
  | {type: 'voice.heard'; utterance: string}
  | {
      type: 'plan.rerouted';
      day: Weekday;
      cancelled: {title: string; reason: string};
      replacement: {recipeId: string; title: string} | null;
    };

// One SSE message from GET /households/:id/events
export type StoredEvent = {seq: number; at: string; event: HomebaseEvent};
