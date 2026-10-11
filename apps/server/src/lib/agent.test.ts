import { describe, expect, it } from "vitest";
import type { Message } from "@aws-sdk/client-bedrock-runtime";
import { runAgentTurn, type ChatModel } from "./agent.js";
import { MemoryStore } from "./store.js";
import { MemoryQueue } from "./queue.js";
import { allTools } from "../features/index.js";
import { seedHousehold } from "../scripts/seed-data.js";

async function ctx() {
  const store = new MemoryStore();
  for (const { kind, doc } of seedHousehold.docs) await store.putDoc(seedHousehold.id, kind, doc);
  return { store, queue: new MemoryQueue(), householdId: "patels", now: () => new Date("2026-10-15T23:00:00Z") };
}

// Scripted model: first asks for a tool, then speaks the result.
function scripted(toolName: string, input: Record<string, unknown>): ChatModel {
  return async (_system, messages: Message[]) => {
    const last = messages.at(-1)!;
    const toolResult = (last.content ?? []).find((c) => "toolResult" in c && c.toolResult);
    if (toolResult && "toolResult" in toolResult) {
      const text = (toolResult.toolResult!.content![0] as { text: string }).text;
      return { role: "assistant", content: [{ text: `Spoken: ${text}` }] };
    }
    return { role: "assistant", content: [{ toolUse: { toolUseId: "t1", name: toolName, input: input as never } }] };
  };
}

describe("agent turn", () => {
  it("calls the chosen tool and speaks its result", async () => {
    const r = await runAgentTurn({ utterance: "what does Homebase know about us?", tools: allTools, ctx: await ctx(), model: scripted("get_household", {}) });
    expect(r.calls.map((c) => c.name)).toEqual(["get_household"]);
    expect(r.reply).toContain("Maya (allergic to peanut)");
  });

  it("passes tool errors back to the model instead of throwing", async () => {
    const r = await runAgentTurn({ utterance: "remember Zed hates peas", tools: allTools, ctx: await ctx(), model: scripted("update_member_preferences", { member: "Zed", addDislikes: ["peas"] }) });
    expect(r.calls[0].isError).toBe(true);
    expect(r.reply).toContain("I don't know anyone called Zed");
  });

  it("does not execute write tools in dry-run mode", async () => {
    const c = await ctx();
    const r = await runAgentTurn({ utterance: "plan dinners", tools: allTools, ctx: c, model: scripted("plan_week", {}), dryRun: true });
    expect(r.calls[0].name).toBe("plan_week");
    expect(await c.store.getDoc("patels", "PLAN")).toBeUndefined();
  });

  it("produces a JSON schema Bedrock accepts for every tool", async () => {
    const { toolSpecs } = await import("./agent.js");
    for (const spec of toolSpecs(allTools)) {
      const json = spec.toolSpec!.inputSchema!.json as { type?: string };
      expect(json.type).toBe("object");
    }
  });
});
