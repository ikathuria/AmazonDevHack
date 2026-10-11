// Typed accessors for the household's documents, plus event emission. Keeps tool handlers short.
import type { Chore, ChoreAssignment, CookSession, Household, HomebaseEvent, MealPlan, PantryItem, Recipe, ShoppingItem } from "./contracts.js";
import type { ToolContext } from "./tools.js";

export type ChoreState = { weekOf: string; assignments: ChoreAssignment[]; history: Record<string, number> };

export const docs = (ctx: ToolContext) => {
  const { store, householdId } = ctx;
  return {
    household: () => store.getDoc<Household>(householdId, "PROFILE"),
    saveHousehold: (h: Household) => store.putDoc(householdId, "PROFILE", h),
    pantry: async () => (await store.getDoc<PantryItem[]>(householdId, "PANTRY")) ?? [],
    savePantry: (p: PantryItem[]) => store.putDoc(householdId, "PANTRY", p),
    chores: async () => (await store.getDoc<Chore[]>(householdId, "CHORES")) ?? [],
    choreState: () => store.getDoc<ChoreState>(householdId, "CHORE_STATE"),
    saveChoreState: (s: ChoreState) => store.putDoc(householdId, "CHORE_STATE", s),
    recipes: () => store.listDocs<Recipe>(householdId, "RECIPE#"),
    recipe: (id: string) => store.getDoc<Recipe>(householdId, `RECIPE#${id}`),
    saveRecipe: (r: Recipe) => store.putDoc(householdId, `RECIPE#${r.id}`, r),
    plan: () => store.getDoc<MealPlan>(householdId, "PLAN"),
    savePlan: (p: MealPlan) => store.putDoc(householdId, "PLAN", p),
    cook: () => store.getDoc<CookSession>(householdId, "COOK"),
    saveCook: (c: CookSession) => store.putDoc(householdId, "COOK", c),
    shopping: async () => (await store.getDoc<ShoppingItem[]>(householdId, "SHOPPING")) ?? [],
    saveShopping: (s: ShoppingItem[]) => store.putDoc(householdId, "SHOPPING", s),
    emit: (e: HomebaseEvent) => store.appendEvent(householdId, e),
  };
};

export const notSetUp = { text: "Homebase isn't set up for this household yet. Open the Homebase web app to add your family.", isError: true };

// Loose name matching for spoken input: "chana" matches "Chana masala", "Maya's" matches "Maya".
export function matchByName<T>(items: T[], spoken: string, name: (t: T) => string): T | undefined {
  const q = spoken.toLowerCase().replace(/'s\b/g, "").trim();
  const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && w !== "the");
  return items.find((i) => name(i).toLowerCase() === q)
    ?? items.find((i) => name(i).toLowerCase().includes(q))
    ?? items.find((i) => q.includes(name(i).toLowerCase()))
    // "peanut noodles" → "Peanut satay noodles": every spoken word appears in the name.
    ?? items.find((i) => { const w = words(q); const n = words(name(i)); return w.length > 0 && w.every((x) => n.some((y) => y.startsWith(x))); });
}
