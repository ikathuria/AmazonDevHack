// Shared Homebase contracts: entities, tool I/O and TV events.
// Consumed by apps/server, apps/tv and apps/web. Change only with both builders' agreement.
import { z } from "zod";

export const Allergen = z.enum(["peanut", "tree_nut", "milk", "egg", "wheat", "gluten", "soy", "fish", "shellfish", "sesame"]);
export type Allergen = z.infer<typeof Allergen>;

export const Diet = z.enum(["vegetarian", "vegan", "pescatarian", "halal", "kosher", "dairy_free", "gluten_free"]);
export type Diet = z.infer<typeof Diet>;

export const Member = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  role: z.enum(["adult", "teen", "child"]),
  allergies: z.array(Allergen).default([]),
  diets: z.array(Diet).default([]),
  dislikes: z.array(z.string().max(40)).default([]),
});
export type Member = z.infer<typeof Member>;

export const Weekday = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
export type Weekday = z.infer<typeof Weekday>;

export const Household = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  members: z.array(Member).min(1),
  // e.g. { tue: "vegetarian" } for "vegetarian Tuesdays"
  dayRules: z.partialRecord(Weekday, Diet).default({}),
  timezone: z.string().default("America/Chicago"),
});
export type Household = z.infer<typeof Household>;

export const PantryItem = z.object({
  name: z.string().min(1).max(60),
  quantity: z.string().max(30).optional(),
});
export type PantryItem = z.infer<typeof PantryItem>;

export const Ingredient = z.object({
  name: z.string().min(1),
  quantity: z.string().optional(),
  allergens: z.array(Allergen).default([]),
});
export type Ingredient = z.infer<typeof Ingredient>;

export const RecipeStep = z.object({
  text: z.string().min(1),
  timerSec: z.number().int().positive().optional(),
});
export type RecipeStep = z.infer<typeof RecipeStep>;

export const Recipe = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  diets: z.array(Diet).default([]),
  minutes: z.number().int().positive(),
  ingredients: z.array(Ingredient).min(1),
  steps: z.array(RecipeStep).min(1),
});
export type Recipe = z.infer<typeof Recipe>;

export const MealPlan = z.object({
  weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["drafting", "ready", "failed"]),
  days: z.partialRecord(Weekday, z.object({ recipeId: z.string(), title: z.string() })).default({}),
  blocked: z.array(z.object({ title: z.string(), reason: z.string() })).default([]),
});
export type MealPlan = z.infer<typeof MealPlan>;

export const Chore = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  effort: z.number().int().min(1).max(5),
  frequency: z.enum(["daily", "weekly"]),
});
export type Chore = z.infer<typeof Chore>;

export const ChoreAssignment = z.object({
  choreId: z.string(),
  memberId: z.string(),
  day: Weekday,
  done: z.boolean().default(false),
});
export type ChoreAssignment = z.infer<typeof ChoreAssignment>;

export const CookSession = z.object({
  recipeId: z.string(),
  stepIndex: z.number().int().min(0),
  timerEndsAt: z.string().optional(),
});
export type CookSession = z.infer<typeof CookSession>;

export const ShoppingItem = z.object({
  name: z.string().min(1),
  quantity: z.string().optional(),
  checked: z.boolean().default(false),
});
export type ShoppingItem = z.infer<typeof ShoppingItem>;

// Events the TV and web board receive over SSE. `seq` is monotonic per household.
export const HomebaseEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("household.updated"), household: Household }),
  z.object({ type: z.literal("plan.updated"), plan: MealPlan }),
  z.object({ type: z.literal("chores.updated"), assignments: z.array(ChoreAssignment) }),
  z.object({ type: z.literal("cook.step"), session: CookSession, step: RecipeStep, total: z.number().int() }),
  z.object({ type: z.literal("cook.timer"), endsAt: z.string(), label: z.string() }),
  z.object({ type: z.literal("shopping.updated"), items: z.array(ShoppingItem) }),
  z.object({ type: z.literal("voice.heard"), utterance: z.string().max(200) }),
  // An unsafe dinner was cancelled and (if possible) replaced. Drives the board's CANCELLED · ALLERGY → REROUTED moment.
  // Added 2026-10-13 (additive; older clients ignore unknown event types).
  z.object({
    type: z.literal("plan.rerouted"),
    day: Weekday,
    cancelled: z.object({ title: z.string(), reason: z.string() }),
    replacement: z.object({ recipeId: z.string(), title: z.string() }).nullable(),
  }),
]);
export type HomebaseEvent = z.infer<typeof HomebaseEvent>;

export const StoredEvent = z.object({
  seq: z.number().int().positive(),
  at: z.string(),
  event: HomebaseEvent,
});
export type StoredEvent = z.infer<typeof StoredEvent>;
