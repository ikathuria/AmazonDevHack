// Shopping list: this week's plan ingredients minus the pantry, plus anything the family adds.
import { z } from "zod";
import type { ShoppingItem } from "../../lib/contracts.js";
import { defineTool } from "../../lib/tools.js";
import { docs, notSetUp } from "../../lib/docs.js";

const norm = (s: string) => s.trim().toLowerCase();

export const shoppingTools = [
  defineTool({
    name: "shopping_list",
    title: "Build or read the shopping list",
    description: "Builds the shopping list from this week's dinner plan minus what's in the pantry, keeps anything added by hand, and reads it out. Use for 'what do we need to buy?' or 'make the grocery list'.",
    input: {},
    handler: async (ctx) => {
      const d = docs(ctx);
      const [h, plan, pantry, existing, recipes] = await Promise.all([d.household(), d.plan(), d.pantry(), d.shopping(), d.recipes()]);
      if (!h) return notSetUp;
      const have = new Set(pantry.map((p) => norm(p.name)));
      const items = new Map<string, ShoppingItem>(existing.map((i) => [norm(i.name), i]));
      for (const entry of Object.values(plan?.status === "ready" ? plan.days : {})) {
        const r = recipes.find((x) => x.id === entry!.recipeId);
        for (const ing of r?.ingredients ?? []) {
          const key = norm(ing.name);
          if (!have.has(key) && !items.has(key)) items.set(key, { name: ing.name, quantity: ing.quantity, checked: false });
        }
      }
      const list = [...items.values()];
      await d.saveShopping(list);
      await d.emit({ type: "shopping.updated", items: list });
      const open = list.filter((i) => !i.checked);
      return { text: open.length ? `You need ${open.length} things: ${open.map((i) => i.name).join(", ")}.` : "You have everything for this week's plan.", data: { items: list } };
    },
  }),
  defineTool({
    name: "add_to_list",
    title: "Add to shopping list",
    description: "Adds items to the household shopping list. Use for 'add rice to the list' or 'we need milk'.",
    input: { items: z.array(z.string().min(1).max(60)).min(1).max(30) },
    handler: async (ctx, { items }) => {
      const d = docs(ctx);
      const list = await d.shopping();
      const added = items.filter((i) => !list.some((x) => norm(x.name) === norm(i)));
      const next = [...list, ...added.map((name) => ({ name, checked: false }))];
      await d.saveShopping(next);
      await d.emit({ type: "shopping.updated", items: next });
      return { text: added.length ? `Added ${added.join(", ")} to the shopping list.` : "That's already on the list.", data: { items: next } };
    },
  }),
  defineTool({
    name: "check_off",
    title: "Check off shopping items",
    description: "Checks items off the shopping list and adds them to the pantry. Use for 'got the rice' or 'check off milk and eggs'.",
    input: { items: z.array(z.string().min(1).max(60)).min(1).max(30) },
    handler: async (ctx, { items }) => {
      const d = docs(ctx);
      const [list, pantry] = await Promise.all([d.shopping(), d.pantry()]);
      const hits = list.filter((x) => items.some((i) => norm(x.name).includes(norm(i))));
      for (const x of hits) x.checked = true;
      const newPantry = [...pantry, ...hits.filter((x) => !pantry.some((p) => norm(p.name) === norm(x.name))).map((x) => ({ name: norm(x.name) }))];
      await Promise.all([d.saveShopping(list), d.savePantry(newPantry)]);
      await d.emit({ type: "shopping.updated", items: list });
      return { text: hits.length ? `Checked off ${hits.map((x) => x.name).join(", ")} and added to the pantry.` : "Those weren't on the list.", data: { items: list } };
    },
  }),
];
