// Meal planning tools. plan_week only enqueues (the worker calls Bedrock) so the call stays under 500 ms.
import { z } from "zod";
import { MealPlan } from "../../lib/contracts.js";
import { defineTool } from "../../lib/tools.js";
import { docs, matchByName, notSetUp } from "../../lib/docs.js";
import { DAY_NAMES, parseDay, weekOf } from "../../lib/time.js";
import { verifyRecipe } from "./allergen-verifier.js";
import { pantryCoverage, speakPlan } from "./planner.js";

export const mealTools = [
  defineTool({
    name: "plan_week",
    title: "Plan this week's dinners",
    description: "Starts planning seven dinners for this week using the household's allergies, diets, house rules and pantry. Planning takes a few seconds; the plan appears on the family TV when ready. Use for 'plan dinners this week' or 'make a meal plan, something quick on Wednesday'.",
    input: { request: z.string().max(300).optional().describe("Any extra wishes, e.g. 'quick meals on Wednesday'") },
    handler: async (ctx, { request }) => {
      const d = docs(ctx);
      const h = await d.household();
      if (!h) return notSetUp;
      const week = weekOf(ctx.now(), h.timezone);
      const plan = MealPlan.parse({ weekOf: week, status: "drafting" });
      await d.savePlan(plan);
      await d.emit({ type: "plan.updated", plan });
      await ctx.queue.send({ kind: "plan_week", householdId: ctx.householdId, weekOf: week, request });
      return { text: `I'm drafting this week's dinners for ${h.name}, checking everyone's allergies. It'll be on the TV in a few seconds.`, data: { status: "drafting", weekOf: week } };
    },
  }),
  defineTool({
    name: "get_plan",
    title: "What's for dinner",
    description: "Tells the user what's planned for dinner on a day (default tonight) or the whole week. Use for 'what's for dinner', 'what are we having Friday' or 'read me the meal plan'.",
    input: { day: z.string().optional().describe("today, tomorrow, a weekday name, or 'week'") },
    readOnly: true,
    handler: async (ctx, { day }) => {
      const d = docs(ctx);
      const [h, plan] = await Promise.all([d.household(), d.plan()]);
      if (!h) return notSetUp;
      if (!plan || plan.status === "failed") return { text: "There's no meal plan yet. Say 'plan dinners this week' and I'll make one." };
      if (plan.weekOf !== weekOf(ctx.now(), h.timezone)) return { text: "I only have last week's plan. Say 'plan dinners this week' and I'll make a new one.", data: { stale: true } };
      if (plan.status === "drafting") return { text: "I'm still drafting the plan. Give me a few more seconds." };
      if (day?.toLowerCase() === "week") return { text: speakPlan(plan), data: { plan } };
      const wd = parseDay(day, ctx.now(), h.timezone);
      const entry = plan.days[wd];
      return { text: entry ? `${DAY_NAMES[wd]}'s dinner is ${entry.title}.` : `Nothing is planned for ${DAY_NAMES[wd]}.`, data: { day: wd, dinner: entry ?? null } };
    },
  }),
  defineTool({
    name: "set_dinner",
    title: "Set a day's dinner",
    description: "Puts a specific recipe on a day of this week's plan. If it isn't safe for everyone (allergies, diets, the day's house rules), Homebase cancels it and swaps in a safe recipe instead, and says why. Use for 'make Friday peanut noodles' or 'swap Tuesday to dal'.",
    input: { day: z.string().describe("today, tomorrow or a weekday name"), recipe: z.string().describe("Recipe name as the user said it") },
    handler: async (ctx, a) => {
      const d = docs(ctx);
      const [h, recipes, existing, pantry] = await Promise.all([d.household(), d.recipes(), d.plan(), d.pantry()]);
      if (!h) return notSetUp;
      const r = matchByName(recipes, a.recipe, (x) => x.title);
      if (!r) return { text: `I don't have a recipe called ${a.recipe}. Some options: ${recipes.slice(0, 5).map((x) => x.title).join(", ")}.`, isError: true };
      const wd = parseDay(a.day, ctx.now(), h.timezone);
      const week = weekOf(ctx.now(), h.timezone);
      const plan = existing && existing.status === "ready" && existing.weekOf === week ? existing : MealPlan.parse({ weekOf: week, status: "ready" });
      const v = verifyRecipe(r, h, wd);
      if (v.ok) {
        plan.days[wd] = { recipeId: r.id, title: r.title };
        await d.savePlan(plan);
        await d.emit({ type: "plan.updated", plan });
        return { text: `Done. ${DAY_NAMES[wd]}'s dinner is ${r.title}.`, data: { plan } };
      }
      // Unsafe: cancel it and reroute to the safest swap (not already planned this week, best pantry coverage, closest cook time).
      const planned = new Set(Object.entries(plan.days).filter(([day]) => day !== wd).map(([, e]) => e!.recipeId));
      // If the day already has a safe dinner, keep it rather than reshuffling the week.
      const current = plan.days[wd] ? recipes.find((x) => x.id === plan.days[wd]!.recipeId && x.id !== r.id) : undefined;
      const kept = current && verifyRecipe(current, h, wd).ok ? current : undefined;
      const swap = kept ?? recipes
        .filter((x) => x.id !== r.id && !planned.has(x.id) && verifyRecipe(x, h, wd).ok)
        .sort((x, y) => pantryCoverage(y, pantry) - pantryCoverage(x, pantry) || Math.abs(x.minutes - r.minutes) - Math.abs(y.minutes - r.minutes))[0];
      const why = v.spoken[0] ?? v.reasons[0];
      if (swap) plan.days[wd] = { recipeId: swap.id, title: swap.title };
      plan.blocked = [{ title: r.title, reason: v.reasons[0] }, ...plan.blocked.filter((b) => b.title !== r.title)];
      await d.savePlan(plan);
      await d.emit({ type: "plan.updated", plan });
      await d.emit({ type: "plan.rerouted", day: wd, cancelled: { title: r.title, reason: v.reasons[0] }, replacement: swap ? { recipeId: swap.id, title: swap.title } : null });
      return {
        text: kept
          ? `Not the ${r.title.toLowerCase()}. ${why}, so ${DAY_NAMES[wd]} stays ${kept.title.toLowerCase()}.`
          : swap
          ? `Not the ${r.title.toLowerCase()}. ${why}, so I swapped in ${swap.title.toLowerCase()} for ${DAY_NAMES[wd]}.`
          : `Not the ${r.title.toLowerCase()}. ${why}, and I couldn't find a safe swap for ${DAY_NAMES[wd]}, so it's open for now.`,
        data: { cancelled: r.title, reasons: v.reasons, replacement: swap?.title ?? null, plan },
      };
    },
  }),
];
