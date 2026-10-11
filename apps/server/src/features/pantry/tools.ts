// Pantry memory: what the household already has, so plans and shopping lists don't buy it twice.
import { z } from "zod";
import { defineTool } from "../../lib/tools.js";
import { docs } from "../../lib/docs.js";

const norm = (s: string) => s.trim().toLowerCase();

export const pantryTools = [
  defineTool({
    name: "list_pantry",
    title: "List pantry",
    description: "Lists what Homebase thinks is in the household's pantry. Use when the user asks what's in the pantry or whether they have an ingredient.",
    input: { ingredient: z.string().optional().describe("Check for one ingredient instead of listing everything") },
    readOnly: true,
    handler: async (ctx, { ingredient }) => {
      const pantry = await docs(ctx).pantry();
      if (ingredient) {
        const hit = pantry.find((p) => norm(p.name).includes(norm(ingredient)));
        return { text: hit ? `Yes, you have ${hit.name}.` : `I don't have ${ingredient} in the pantry list.`, data: { found: !!hit } };
      }
      return { text: pantry.length ? `The pantry has ${pantry.length} items: ${pantry.map((p) => p.name).join(", ")}.` : "The pantry list is empty.", data: { pantry } };
    },
  }),
  defineTool({
    name: "add_pantry_items",
    title: "Add to pantry",
    description: "Records items the household now has (e.g. after shopping). Use for 'we bought rice and eggs' or 'add milk to the pantry'.",
    input: { items: z.array(z.string().min(1).max(60)).min(1).max(30) },
    handler: async (ctx, { items }) => {
      const d = docs(ctx);
      const pantry = await d.pantry();
      const added = items.filter((i) => !pantry.some((p) => norm(p.name) === norm(i)));
      await d.savePantry([...pantry, ...added.map((name) => ({ name: norm(name) }))]);
      return { text: added.length ? `Added ${added.join(", ")} to the pantry.` : "Those are already in the pantry.", data: { added } };
    },
  }),
  defineTool({
    name: "remove_pantry_items",
    title: "Remove from pantry",
    description: "Records that the household ran out of items. Use for 'we're out of rice' or 'used the last of the eggs'.",
    input: { items: z.array(z.string().min(1).max(60)).min(1).max(30) },
    handler: async (ctx, { items }) => {
      const d = docs(ctx);
      const pantry = await d.pantry();
      const keep = pantry.filter((p) => !items.some((i) => norm(p.name).includes(norm(i))));
      const removed = pantry.length - keep.length;
      await d.savePantry(keep);
      return { text: removed ? `Okay, marked ${items.join(", ")} as used up.` : `${items.join(", ")} wasn't on the pantry list.`, data: { removed } };
    },
  }),
];
