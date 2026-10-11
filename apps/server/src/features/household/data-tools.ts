// Data portability and deletion. Homebase holds family data, so households can take it with them or erase it.
// Lessons from Yummly's shutdown (users lost recipes with no export) and AnyList's broken Alexa link: keep data portable.
import { z } from "zod";
import { defineTool } from "../../lib/tools.js";
import { docs, notSetUp } from "../../lib/docs.js";

export const dataTools = [
  defineTool({
    name: "export_household",
    title: "Export household data",
    description: "Exports everything Homebase stores for the household (members, pantry, chores, recipes, plan, shopping list) as JSON. Use when the user asks to download or back up their Homebase data.",
    input: {},
    readOnly: true,
    handler: async (ctx) => {
      const d = docs(ctx);
      const [household, pantry, chores, choreState, recipes, plan, shopping] = await Promise.all([
        d.household(), d.pantry(), d.chores(), d.choreState(), d.recipes(), d.plan(), d.shopping(),
      ]);
      if (!household) return notSetUp;
      const exportDoc = { exportedAt: ctx.now().toISOString(), format: "homebase-export-v1", household, pantry, chores, choreState: choreState ?? null, recipes, plan: plan ?? null, shopping };
      return { text: `Your Homebase export is ready: ${household.members.length} people, ${recipes.length} recipes, ${pantry.length} pantry items. Download it from the Homebase web app.`, data: exportDoc };
    },
  }),
  defineTool({
    name: "delete_household_data",
    title: "Delete all household data",
    description: "Permanently deletes everything Homebase stores for this household. Only call this when the user explicitly confirms they want all their Homebase data erased; pass confirm=true only after they have said yes.",
    input: { confirm: z.boolean().describe("Must be true, and only after the user explicitly confirmed") },
    handler: async (ctx, { confirm }) => {
      // The public demo household (no auth until M5) can't be wiped by anyone who finds the URL.
      if ((process.env.PROTECTED_HOUSEHOLDS ?? "").split(",").includes(ctx.householdId)) {
        return { text: "This is the shared Homebase demo household, so deleting it is turned off.", isError: true };
      }
      if (!confirm) return { text: "This erases all of your family's Homebase data and can't be undone. Say 'yes, delete everything' to confirm.", isError: true };
      const removed = await ctx.store.deleteHousehold(ctx.householdId);
      return { text: `Done. I deleted all ${removed} Homebase records for this household.`, data: { removed } };
    },
  }),
];
