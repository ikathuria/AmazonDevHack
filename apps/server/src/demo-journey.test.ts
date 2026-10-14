// E2E of the demo journey through a real MCP client, with the background planner running in-process.
import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "./app.js";
import { MemoryStore } from "./lib/store.js";
import { MemoryQueue } from "./lib/queue.js";
import { runJob } from "./jobs.js";
import { seedHousehold } from "./scripts/seed-data.js";
import type { Llm } from "./lib/llm.js";
import type { MealPlan, StoredEvent } from "./lib/contracts.js";

// Thursday 2026-10-15, 6pm Chicago.
const now = () => new Date("2026-10-15T23:00:00Z");

async function setup(llm?: Llm) {
  const store = new MemoryStore();
  for (const { kind, doc } of seedHousehold.docs) await store.putDoc(seedHousehold.id, kind, doc);
  const jobs: Promise<void>[] = [];
  const queue = new MemoryQueue();
  queue.send = async (job) => { jobs.push(runJob(job, store, llm)); };
  const app = createApp({ store, queue, demoHouseholdId: "patels", now });
  const client = new Client({ name: "e2e", version: "0" });
  await client.connect(new StreamableHTTPClientTransport(new URL("http://test/mcp"), { fetch: async (i, init) => app.fetch(new Request(i, init)) }));
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = await client.callTool({ name, arguments: args });
    return { text: (r.content as { text: string }[])[0].text, isError: !!r.isError };
  };
  const drain = () => Promise.all(jobs.splice(0));
  return { store, app, call, drain, client };
}

describe("demo journey", () => {
  it("plans, splits chores, cooks hands-free and builds the shopping list", async () => {
    const { store, call, drain, client } = await setup();

    const plan = await call("plan_week");
    expect(plan.text).toContain("drafting");
    await drain();
    const saved = (await store.getDoc<MealPlan>("patels", "PLAN"))!;
    expect(saved.status).toBe("ready");
    expect(Object.keys(saved.days)).toHaveLength(7);
    // Peanut noodles must never be planned for a household with a peanut allergy, and the block is reported.
    expect(Object.values(saved.days).map((d) => d!.recipeId)).not.toContain("peanut-noodles");
    expect(saved.blocked.map((b) => b.title)).toContain("Peanut satay noodles");
    // Vegetarian Tuesday holds.
    expect(saved.days.tue!.recipeId).not.toBe("chicken-tikka");

    const tonight = await call("get_plan", { day: "tonight" });
    expect(tonight.text).toMatch(/^Thursday's dinner is /);

    const chores = await call("assign_chores");
    expect(chores.text).toContain("Chores are split");
    const dishes = await call("whos_on", { chore: "dishes", day: "tonight" });
    expect(dishes.text).toMatch(/(Priya|Arjun) is on dishes today/);

    const start = await call("start_cooking");
    expect(start.text).toContain("Step 1 of");
    const next = await call("next_step");
    expect(next.text).toContain("Step 2 of");
    const timer = await call("start_timer", { minutes: 8 });
    expect(timer.text).toContain("8 minutes");

    const list = await call("shopping_list");
    expect(list.text).toMatch(/You need \d+ things|You have everything/);

    // The TV would have seen these, in order.
    const events = await store.eventsAfter("patels", 0, 100);
    const types = events.map((e: StoredEvent) => e.event.type);
    expect(types).toEqual(expect.arrayContaining(["plan.updated", "chores.updated", "cook.step", "cook.timer", "shopping.updated"]));
    expect(types.indexOf("cook.step")).toBeLessThan(types.indexOf("cook.timer"));
    await client.close();
  });

  it("refuses to put a peanut recipe on the plan and says why", async () => {
    const { call, client } = await setup();
    const r = await call("set_dinner", { day: "friday", recipe: "peanut noodles" });
    expect(r.text).toBe("I can't put Peanut satay noodles on Friday: peanut butter contains peanut and Maya is allergic. Want me to suggest something else?");
    await client.close();
  });

  it("uses the LLM's picks when they're safe and replaces the unsafe ones", async () => {
    const fakeLlm: Llm = async () => JSON.stringify({ days: { mon: "dal-tadka", tue: "chicken-tikka", fri: "peanut-noodles" }, newRecipes: [] });
    const { store, call, drain, client } = await setup(fakeLlm);
    await call("plan_week");
    await drain();
    const plan = (await store.getDoc<MealPlan>("patels", "PLAN"))!;
    expect(plan.days.mon!.recipeId).toBe("dal-tadka");
    expect(plan.days.tue!.recipeId).not.toBe("chicken-tikka"); // vegetarian Tuesday
    expect(plan.days.fri!.recipeId).not.toBe("peanut-noodles");
    expect(plan.blocked.map((b) => b.reason).join(" ")).toContain("tue is vegetarian");
    await client.close();
  });

  it("falls back to the deterministic planner when the LLM returns junk", async () => {
    const { store, call, drain, client } = await setup(async () => "sorry, I can't");
    await call("plan_week");
    await drain();
    expect((await store.getDoc<MealPlan>("patels", "PLAN"))!.status).toBe("ready");
    await client.close();
  });

  it("doesn't read last week's plan as this week's", async () => {
    const { store, call, client } = await setup();
    await store.putDoc("patels", "PLAN", { weekOf: "2026-10-05", status: "ready", days: { thu: { recipeId: "dal-tadka", title: "Dal tadka" } }, blocked: [] });
    const r = await call("get_plan", { day: "tonight" });
    expect(r.text).toContain("last week's plan");
    await client.close();
  });

  it("remembers preferences across sessions", async () => {
    const { call, client } = await setup();
    await call("update_member_preferences", { member: "Arjun", addDiets: ["vegetarian"] });
    const again = await call("get_household");
    expect(again.text).toContain("Arjun (vegetarian)");
    await client.close();
  });

  it("serves the same tools over REST for the TV's D-pad", async () => {
    const { app } = await setup();
    await app.request("/api/tools/start_cooking", { method: "POST", body: JSON.stringify({ recipe: "chana masala" }), headers: { "content-type": "application/json" } });
    const res = await app.request("/api/tools/next_step", { method: "POST" });
    expect((await res.json()).text).toContain("Step 2 of 5");
    const state = await (await app.request("/households/patels/state")).json();
    expect(state.cook.session.stepIndex).toBe(1);
    expect(state.cook.recipe.title).toBe("Chana masala");
  });

  it("gives a speakable error for bad input instead of throwing", async () => {
    const { call, client } = await setup();
    const r = await call("update_member_preferences", { member: "Zed", addAllergies: ["peanut"] });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("I don't know anyone called Zed");
    await client.close();
  });
});
