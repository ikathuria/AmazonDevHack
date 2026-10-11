// Weekly meal planning. The LLM proposes; the allergen verifier disposes; a deterministic picker fills gaps.
import { z } from "zod";
import { MealPlan, Recipe, type Household, type PantryItem, type Weekday } from "../../lib/contracts.js";
import { extractJson, type Llm } from "../../lib/llm.js";
import { DAY_NAMES, WEEKDAYS } from "../../lib/time.js";
import { verifyRecipe } from "./allergen-verifier.js";
import { describeHousehold } from "../household/describe.js";

const LlmPlan = z.object({
  days: z.partialRecord(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]), z.string()),
  newRecipes: z.array(z.unknown()).max(2).default([]),
});

const SYSTEM = `You plan family dinners for a smart-home assistant. Reply with ONLY a JSON object, no prose:
{"days":{"mon":"<recipe id>",...all 7 days},"newRecipes":[<up to 2 new recipes, same shape as the library>]}
Rules: prefer library recipes; respect every allergy, diet and day rule; vary cuisines; prefer recipes using pantry items;
a new recipe needs id, title, diets, minutes, ingredients[{name,quantity,allergens}], steps[{text,timerSec?}] and must tag allergens honestly.`;

export function pantryCoverage(recipe: Recipe, pantry: PantryItem[]) {
  const have = new Set(pantry.map((p) => p.name.toLowerCase()));
  return recipe.ingredients.filter((i) => have.has(i.name.toLowerCase())).length / recipe.ingredients.length;
}

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export type PlanInput = {
  household: Household;
  library: Recipe[];
  pantry: PantryItem[];
  weekOf: string;
  request?: string;
};

export type PlanOutput = { plan: MealPlan; newRecipes: Recipe[]; source: "llm" | "fallback"; llmPicks: number };

// Deterministic: for each day pick the safe, unused recipe with the best pantry coverage (seeded tie-break per week).
export function fillDays(input: PlanInput, chosen: Partial<Record<Weekday, Recipe>>): Partial<Record<Weekday, Recipe>> {
  const used = new Set(Object.values(chosen).map((r) => r!.id));
  const out = { ...chosen };
  for (const day of WEEKDAYS) {
    if (out[day]) continue;
    const candidates = input.library
      .filter((r) => !used.has(r.id) && verifyRecipe(r, input.household, day).ok)
      .sort((a, b) => pantryCoverage(b, input.pantry) - pantryCoverage(a, input.pantry) || (hash(input.weekOf + a.id) % 97) - (hash(input.weekOf + b.id) % 97));
    const pick = candidates[0] ?? input.library.find((r) => verifyRecipe(r, input.household, day).ok);
    if (pick) {
      out[day] = pick;
      used.add(pick.id);
    }
  }
  return out;
}

export async function planWeek(input: PlanInput, llm?: Llm): Promise<PlanOutput> {
  const blocked: { title: string; reason: string }[] = [];
  const newRecipes: Recipe[] = [];
  let chosen: Partial<Record<Weekday, Recipe>> = {};
  let source: PlanOutput["source"] = "fallback";

  // Always report library recipes this household can never have (e.g. peanut noodles with a peanut allergy).
  for (const r of input.library) {
    const v = verifyRecipe(r, input.household);
    if (!v.ok) blocked.push({ title: r.title, reason: v.reasons[0] });
  }

  if (llm) {
    try {
      const prompt = [
        `Household: ${describeHousehold(input.household)}`,
        `Pantry: ${input.pantry.map((p) => p.name).join(", ")}`,
        input.request ? `Request from the family: "${input.request}"` : "",
        `Library (id: title [diets]):\n${input.library.map((r) => `${r.id}: ${r.title} [${r.diets.join(", ")}]`).join("\n")}`,
      ].filter(Boolean).join("\n\n");
      const raw = LlmPlan.parse(extractJson(await llm(SYSTEM, prompt)));
      for (const nr of raw.newRecipes) {
        const parsed = Recipe.safeParse(nr);
        if (parsed.success && !input.library.some((r) => r.id === parsed.data.id)) newRecipes.push(parsed.data);
      }
      const byId = new Map([...input.library, ...newRecipes].map((r) => [r.id, r]));
      for (const day of WEEKDAYS) {
        const r = raw.days[day] ? byId.get(raw.days[day]!) : undefined;
        if (!r) continue;
        const v = verifyRecipe(r, input.household, day);
        if (v.ok) chosen[day] = r;
        else blocked.push({ title: r.title, reason: v.reasons[0] });
      }
      source = "llm";
    } catch (err) {
      console.warn("[planner] LLM plan unusable, falling back to deterministic picker:", (err as Error).message);
    }
  }

  const llmPicks = Object.keys(chosen).length;
  chosen = fillDays({ ...input, library: [...input.library, ...newRecipes.filter((r) => verifyRecipe(r, input.household).ok)] }, chosen);
  const days = Object.fromEntries(Object.entries(chosen).map(([d, r]) => [d, { recipeId: r!.id, title: r!.title }]));
  const uniqueBlocked = [...new Map(blocked.map((b) => [b.title, b])).values()];
  return {
    plan: MealPlan.parse({ weekOf: input.weekOf, status: "ready", days, blocked: uniqueBlocked }),
    newRecipes: newRecipes.filter((r) => Object.values(chosen).some((c) => c!.id === r.id)),
    source,
    llmPicks,
  };
}

export function speakPlan(plan: MealPlan, from?: Weekday): string {
  const days = WEEKDAYS.slice(from ? WEEKDAYS.indexOf(from) : 0).filter((d) => plan.days[d]);
  if (!days.length) return "There's no dinner plan yet.";
  return days.map((d) => `${DAY_NAMES[d]}: ${plan.days[d]!.title}`).join(". ") + ".";
}
