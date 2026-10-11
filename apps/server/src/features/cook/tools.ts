// Hands-free cook-along. Every step change is pushed to the TV as an event.
import { z } from "zod";
import type { CookSession, Recipe } from "../../lib/contracts.js";
import { defineTool, type ToolContext } from "../../lib/tools.js";
import { docs, matchByName, notSetUp } from "../../lib/docs.js";
import { parseDay } from "../../lib/time.js";

function minutes(sec: number) {
  return sec % 60 === 0 ? `${sec / 60} minute${sec === 60 ? "" : "s"}` : `${Math.round(sec / 60)} minutes`;
}

async function showStep(ctx: ToolContext, recipe: Recipe, stepIndex: number, prefix = "") {
  const d = docs(ctx);
  const step = recipe.steps[stepIndex];
  const session: CookSession = { recipeId: recipe.id, stepIndex };
  await d.saveCook(session);
  await d.emit({ type: "cook.step", session, step, total: recipe.steps.length });
  const timerHint = step.timerSec ? ` Say "start the timer" for ${minutes(step.timerSec)}.` : "";
  const last = stepIndex === recipe.steps.length - 1 ? " That's the last step. Enjoy!" : "";
  return { text: `${prefix}Step ${stepIndex + 1} of ${recipe.steps.length}: ${step.text}${timerHint}${last}`, data: { session, step, total: recipe.steps.length } };
}

async function current(ctx: ToolContext) {
  const d = docs(ctx);
  const session = await d.cook();
  const recipe = session ? await d.recipe(session.recipeId) : undefined;
  return session && recipe ? { session, recipe } : undefined;
}

const noSession = { text: "We're not cooking anything yet. Say 'let's cook tonight's dinner' to start.", isError: true };

export const cookTools = [
  defineTool({
    name: "start_cooking",
    title: "Start cooking",
    description: "Starts a hands-free cook-along on the family TV for a recipe, or for tonight's planned dinner if none is named. Use for 'let's cook', 'start cooking the chana masala' or 'walk me through dinner'.",
    input: { recipe: z.string().optional().describe("Recipe name; omit for tonight's planned dinner") },
    handler: async (ctx, a) => {
      const d = docs(ctx);
      const [h, recipes, plan] = await Promise.all([d.household(), d.recipes(), d.plan()]);
      if (!h) return notSetUp;
      let recipe: Recipe | undefined;
      if (a.recipe) recipe = matchByName(recipes, a.recipe, (r) => r.title);
      else {
        const tonight = plan?.days[parseDay("today", ctx.now(), h.timezone)];
        recipe = tonight && recipes.find((r) => r.id === tonight.recipeId);
        if (!recipe) return { text: "Nothing is planned for tonight. Tell me which recipe to cook.", isError: true };
      }
      if (!recipe) return { text: `I don't have a recipe called ${a.recipe}.`, isError: true };
      const shopping = new Set((await d.pantry()).map((p) => p.name.toLowerCase()));
      const missing = recipe.ingredients.filter((i) => !shopping.has(i.name.toLowerCase())).map((i) => i.name);
      const prefix = `Let's make ${recipe.title}. It takes about ${recipe.minutes} minutes.${missing.length ? ` Heads up, the pantry list doesn't have ${missing.join(", ")}.` : ""} `;
      return showStep(ctx, recipe, 0, prefix);
    },
  }),
  defineTool({
    name: "next_step",
    title: "Next step",
    description: "Moves the cook-along to the next step. Use for 'next', 'next step', 'done, what now?'.",
    input: {},
    handler: async (ctx) => {
      const c = await current(ctx);
      if (!c) return noSession;
      if (c.session.stepIndex >= c.recipe.steps.length - 1) return { text: `That was the last step of ${c.recipe.title}. Enjoy your dinner!` };
      return showStep(ctx, c.recipe, c.session.stepIndex + 1);
    },
  }),
  defineTool({
    name: "previous_step",
    title: "Previous step",
    description: "Goes back one step in the cook-along. Use for 'go back' or 'previous step'.",
    input: {},
    handler: async (ctx) => {
      const c = await current(ctx);
      if (!c) return noSession;
      return showStep(ctx, c.recipe, Math.max(0, c.session.stepIndex - 1));
    },
  }),
  defineTool({
    name: "repeat_step",
    title: "Repeat step",
    description: "Repeats the current cook-along step. Use for 'say that again' or 'what was that step?'.",
    input: {},
    readOnly: true,
    handler: async (ctx) => {
      const c = await current(ctx);
      if (!c) return noSession;
      const step = c.recipe.steps[c.session.stepIndex];
      return { text: `Step ${c.session.stepIndex + 1}: ${step.text}`, data: { step } };
    },
  }),
  defineTool({
    name: "start_timer",
    title: "Start a cooking timer",
    description: "Starts a countdown on the family TV, using the current step's time unless minutes are given. Use for 'start the timer' or 'set a timer for 8 minutes'.",
    input: { minutes: z.number().positive().max(240).optional() },
    handler: async (ctx, a) => {
      const c = await current(ctx);
      const step = c?.recipe.steps[c.session.stepIndex];
      const sec = a.minutes ? Math.round(a.minutes * 60) : step?.timerSec;
      if (!sec) return { text: "How many minutes should the timer be?", isError: true };
      const endsAt = new Date(ctx.now().getTime() + sec * 1000).toISOString();
      const label = c ? `${c.recipe.title}, step ${c.session.stepIndex + 1}` : "Timer";
      if (c) await docs(ctx).saveCook({ ...c.session, timerEndsAt: endsAt });
      await docs(ctx).emit({ type: "cook.timer", endsAt, label });
      return { text: `Timer set for ${minutes(sec)}. I'll show it on the TV.`, data: { endsAt, label } };
    },
  }),
];
