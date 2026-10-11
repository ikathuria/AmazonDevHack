// Household memory: who lives here and what Homebase remembers about them.
import { z } from "zod";
import { Allergen, Diet } from "../../lib/contracts.js";
import { defineTool } from "../../lib/tools.js";
import { docs, matchByName, notSetUp } from "../../lib/docs.js";
import { describeHousehold } from "./describe.js";

export const householdTools = [
  defineTool({
    name: "get_household",
    title: "Get household",
    description: "Returns who lives in the Homebase household and what Homebase remembers about them: allergies, diets, dislikes and house rules. Use before planning meals or when the user asks what Homebase knows about the family.",
    input: {},
    readOnly: true,
    handler: async (ctx) => {
      const h = await docs(ctx).household();
      if (!h) return notSetUp;
      return { text: describeHousehold(h), data: { household: h } };
    },
  }),
  defineTool({
    name: "update_member_preferences",
    title: "Remember a family member's allergies, diets or dislikes",
    description: "Saves an allergy, diet or food dislike for one household member so future meal plans respect it. Use when the user says things like 'Maya is allergic to peanuts', 'Arjun went vegetarian' or 'Priya doesn't like mushrooms'.",
    input: {
      member: z.string().describe("The family member's name"),
      addAllergies: z.array(Allergen).optional(),
      removeAllergies: z.array(Allergen).optional(),
      addDiets: z.array(Diet).optional(),
      removeDiets: z.array(Diet).optional(),
      addDislikes: z.array(z.string().max(40)).optional(),
    },
    handler: async (ctx, a) => {
      const d = docs(ctx);
      const h = await d.household();
      if (!h) return notSetUp;
      const m = matchByName(h.members, a.member, (x) => x.name);
      if (!m) return { text: `I don't know anyone called ${a.member} in ${h.name}. The household is ${h.members.map((x) => x.name).join(", ")}.`, isError: true };
      const edit = <T>(list: T[], add?: T[], remove?: T[]) => [...new Set([...list.filter((x) => !remove?.includes(x)), ...(add ?? [])])];
      m.allergies = edit(m.allergies, a.addAllergies, a.removeAllergies);
      m.diets = edit(m.diets, a.addDiets, a.removeDiets);
      m.dislikes = edit(m.dislikes, a.addDislikes);
      await d.saveHousehold(h);
      await d.emit({ type: "household.updated", household: h });
      return { text: `Got it. ${describeHousehold(h)} Future meal plans will respect this.`, data: { member: m } };
    },
  }),
];
