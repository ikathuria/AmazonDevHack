// Background job handlers, shared by the SQS worker (AWS) and the in-memory queue (local dev/tests).
import type { Job } from "./lib/queue.js";
import type { Store } from "./lib/store.js";
import type { Llm } from "./lib/llm.js";
import { MealPlan } from "./lib/contracts.js";
import { docs } from "./lib/docs.js";
import { MemoryQueue } from "./lib/queue.js";
import { planWeek } from "./features/meals/planner.js";

export async function runJob(job: Job, store: Store, llm?: Llm) {
  const ctx = { store, queue: new MemoryQueue(), householdId: job.householdId, now: () => new Date() };
  const d = docs(ctx);
  switch (job.kind) {
    case "plan_week": {
      const [household, library, pantry] = await Promise.all([d.household(), d.recipes(), d.pantry()]);
      if (!household) throw new Error(`household ${job.householdId} not found`);
      try {
        const { plan, newRecipes, source, llmPicks } = await planWeek({ household, library, pantry, weekOf: job.weekOf, request: job.request }, llm);
        console.log(JSON.stringify({ job: "plan_week", householdId: job.householdId, source, llmPicks, newRecipes: newRecipes.length, blocked: plan.blocked.length }));
        for (const r of newRecipes) await d.saveRecipe(r);
        await d.savePlan(plan);
        await d.emit({ type: "plan.updated", plan });
      } catch (err) {
        const failed = MealPlan.parse({ weekOf: job.weekOf, status: "failed" });
        await d.savePlan(failed);
        await d.emit({ type: "plan.updated", plan: failed });
        throw err;
      }
      return;
    }
  }
}
