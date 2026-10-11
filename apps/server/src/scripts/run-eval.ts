// Tool-selection eval: does an LLM client pick the right Homebase tool (and args) for each household request?
// Runs the agent in dry-run mode (write tools are not executed) against the in-memory demo household.
// Usage: npm --prefix apps/server run eval      (needs Bedrock access; writes eval/RESULTS.md)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { bedrockChatModel, runAgentTurn } from "../lib/agent.js";
import { MemoryStore } from "../lib/store.js";
import { MemoryQueue } from "../lib/queue.js";
import { allTools } from "../features/index.js";
import { seedHousehold } from "./seed-data.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const EvalFile = z.object({
  requests: z.array(z.object({ id: z.string(), utterance: z.string(), expect: z.object({ tool: z.string(), args: z.record(z.string(), z.unknown()).optional() }) })),
});
const { requests } = EvalFile.parse(JSON.parse(readFileSync(join(root, "eval/requests.json"), "utf8")));

const store = new MemoryStore();
for (const { kind, doc } of seedHousehold.docs) await store.putDoc(seedHousehold.id, kind, doc);
const ctx = { store, queue: new MemoryQueue(), householdId: "patels", now: () => new Date() };
const model = bedrockChatModel();

function argsMatch(expected: Record<string, unknown> = {}, actual: Record<string, unknown>) {
  return Object.entries(expected).every(([k, v]) => {
    const a = actual[k];
    if (typeof v === "string") return JSON.stringify(a ?? "").toLowerCase().includes(v.toLowerCase());
    return JSON.stringify(a) === JSON.stringify(v);
  });
}

const rows: string[] = [];
let toolOk = 0, allOk = 0;
for (const r of requests) {
  const turn = await runAgentTurn({ utterance: r.utterance, tools: allTools, ctx, model, dryRun: true });
  const first = turn.calls[0];
  const t = first?.name === r.expect.tool;
  const a = t && argsMatch(r.expect.args, first.input);
  toolOk += t ? 1 : 0;
  allOk += a ? 1 : 0;
  rows.push(`| ${r.id} | ${r.utterance.replaceAll("|", "/")} | \`${r.expect.tool}\` | \`${first?.name ?? "(none)"}\` ${first ? "`" + JSON.stringify(first.input).replaceAll("|", "/") + "`" : ""} | ${t ? "✅" : "❌"} | ${a ? "✅" : "❌"} |`);
  console.log(`${t ? "✓" : "✗"} ${r.id}: ${r.utterance} → ${first?.name ?? "(none)"}`);
}

const md = `# Tool-selection eval results

Run ${new Date().toISOString()} · model \`${process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0"}\` acting as the Alexa+ client · ${allTools.length} Homebase tools · dry run (write tools not executed).
Reproduce: \`npm --prefix apps/server run eval\`. Requests: [\`eval/requests.json\`](requests.json) (human-written).

**Right tool: ${toolOk}/${requests.length}. Right tool and arguments: ${allOk}/${requests.length}.**

| id | Request | Expected | Chosen (args) | Tool | Tool + args |
|---|---|---|---|---|---|
${rows.join("\n")}
`;
writeFileSync(join(root, "eval/RESULTS.md"), md);
console.log(`\nright tool ${toolOk}/${requests.length}, tool+args ${allOk}/${requests.length} → eval/RESULTS.md`);
