import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../lib/store.js";
import { MemoryQueue } from "../../lib/queue.js";
import { runTool, type ToolContext } from "../../lib/tools.js";
import { seedHousehold } from "../../scripts/seed-data.js";
import type { CookSession } from "../../lib/contracts.js";
import { cookTools } from "./tools.js";

// The clock is mutable so a test can let a timer run out.
async function setup() {
  const store = new MemoryStore();
  for (const { kind, doc } of seedHousehold.docs) await store.putDoc(seedHousehold.id, kind, doc);
  let t = new Date("2026-10-15T23:00:00Z").getTime();
  const ctx: ToolContext = { store, queue: new MemoryQueue(), householdId: "patels", now: () => new Date(t) };
  const call = (name: string, args: Record<string, unknown> = {}) => runTool(cookTools.find((x) => x.name === name)!, ctx, args);
  const session = () => store.getDoc<CookSession>("patels", "COOK");
  return { call, session, advance: (ms: number) => { t += ms; } };
}

describe("cook timer", () => {
  // A TV or /board that starts mid-recipe reads the timer from the saved session, so it must survive step changes.
  it("keeps a running timer when the cook-along moves to another step", async () => {
    const { call, session } = await setup();
    await call("start_cooking", { recipe: "chana masala" });
    const timer = await call("start_timer", { minutes: 8 });
    const endsAt = (timer.data as { endsAt: string }).endsAt;

    await call("next_step");
    expect((await session())?.timerEndsAt).toBe(endsAt);
    await call("previous_step");
    expect(await session()).toEqual({ recipeId: "chana-masala", stepIndex: 0, timerEndsAt: endsAt });
  });

  it("drops a timer that has already run out, and any timer when cooking restarts", async () => {
    const { call, session, advance } = await setup();
    await call("start_cooking", { recipe: "chana masala" });
    await call("start_timer", { minutes: 8 });
    advance(9 * 60_000);
    await call("next_step");
    expect((await session())?.timerEndsAt).toBeUndefined();

    await call("start_timer", { minutes: 8 });
    await call("start_cooking", { recipe: "chana masala" });
    expect(await session()).toEqual({ recipeId: "chana-masala", stepIndex: 0 });
  });
});
