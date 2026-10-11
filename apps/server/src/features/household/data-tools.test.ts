import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../lib/store.js";
import { MemoryQueue } from "../../lib/queue.js";
import { runTool, type ToolContext } from "../../lib/tools.js";
import { seedHousehold } from "../../scripts/seed-data.js";
import { dataTools } from "./data-tools.js";
import { Household, Recipe } from "../../lib/contracts.js";
import { z } from "zod";

async function ctx(): Promise<ToolContext> {
  const store = new MemoryStore();
  for (const { kind, doc } of seedHousehold.docs) await store.putDoc(seedHousehold.id, kind, doc);
  await store.appendEvent("patels", { type: "voice.heard", utterance: "hi" });
  return { store, queue: new MemoryQueue(), householdId: "patels", now: () => new Date("2026-10-15T12:00:00Z") };
}
const tool = (name: string) => dataTools.find((t) => t.name === name)!;

describe("data tools", () => {
  it("exports a document that validates against the contracts", async () => {
    const r = await runTool(tool("export_household"), await ctx(), {});
    const parsed = z.object({ format: z.literal("homebase-export-v1"), household: Household, recipes: z.array(Recipe) }).safeParse(r.data);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.recipes).toHaveLength(12);
  });

  it("refuses to delete without explicit confirmation", async () => {
    const c = await ctx();
    const r = await runTool(tool("delete_household_data"), c, { confirm: false });
    expect(r.isError).toBe(true);
    expect(await c.store.getDoc("patels", "PROFILE")).toBeDefined();
  });

  it("never deletes a protected demo household", async () => {
    const c = await ctx();
    process.env.PROTECTED_HOUSEHOLDS = "patels";
    try {
      const r = await runTool(tool("delete_household_data"), c, { confirm: true });
      expect(r.isError).toBe(true);
      expect(await c.store.getDoc("patels", "PROFILE")).toBeDefined();
    } finally {
      delete process.env.PROTECTED_HOUSEHOLDS;
    }
  });

  it("deletes every item, leaving zero behind", async () => {
    const c = await ctx();
    const r = await runTool(tool("delete_household_data"), c, { confirm: true });
    expect(r.data?.removed).toBe(seedHousehold.docs.length + 1);
    expect(await c.store.getDoc("patels", "PROFILE")).toBeUndefined();
    expect(await c.store.listDocs("patels", "")).toHaveLength(0);
    expect(await c.store.eventsAfter("patels", 0)).toHaveLength(0);
  });
});
