// Replays N calls per tool against a deployed server over MCP and writes eval/latency.md.
// Usage: npm --prefix apps/server run latency -- <serverUrl> [callsPerTool]
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");
const perTool = Number(process.argv[3] ?? 20);
const client = new Client({ name: "homebase-latency", version: "0" });
await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));

// plan_week is excluded: it only enqueues, and replaying it 20x would spam the Bedrock worker.
const calls: [string, Record<string, unknown>][] = [
  ["get_household", {}],
  ["get_plan", { day: "tonight" }],
  ["set_dinner", { day: "monday", recipe: "dal tadka" }],
  ["whos_on", { chore: "dishes" }],
  ["chore_balance", {}],
  ["start_cooking", { recipe: "chana masala" }],
  ["next_step", {}],
  ["start_timer", { minutes: 5 }],
  ["shopping_list", {}],
  ["list_pantry", { ingredient: "rice" }],
];

// One warm-up call so the report measures steady state, as Alexa+ sees it with the warm-up rule running.
await client.callTool({ name: "get_household", arguments: {} });

const results: Record<string, number[]> = {};
for (let i = 0; i < perTool; i++) {
  for (const [name, args] of calls) {
    const t0 = performance.now();
    await client.callTool({ name, arguments: args });
    (results[name] ??= []).push(performance.now() - t0);
  }
}
await client.close();

const pct = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
const all = Object.values(results).flat();
const rows = Object.entries(results).map(([name, xs]) => `| \`${name}\` | ${xs.length} | ${pct(xs, 50).toFixed(0)} | ${pct(xs, 95).toFixed(0)} | ${Math.max(...xs).toFixed(0)} | ${pct(xs, 95) < 500 ? "✅" : "❌"} |`);
const md = `# Tool latency (live)

Measured ${new Date().toISOString()} from a laptop in Chicago against \`${base}\` (AWS us-east-1, Lambda arm64 1024 MB, DynamoDB on-demand), MCP Streamable HTTP, round trip as seen by the client.
Reproduce: \`npm --prefix apps/server run latency -- <serverUrl> ${perTool}\`.

**Overall: ${all.length} calls, p50 ${pct(all, 50).toFixed(0)} ms, p95 ${pct(all, 95).toFixed(0)} ms, max ${Math.max(...all).toFixed(0)} ms.** Alexa+ certification budget: 500 ms round trip.

| Tool | Calls | p50 ms | p95 ms | max ms | p95 < 500 ms |
|---|---|---|---|---|---|
${rows.join("\n")}

Notes: excludes \`plan_week\` (enqueue only; the Bedrock call runs in the SQS worker). A cold start measured ~1.1 s before the 5-minute EventBridge warm-up rule was added.
`;
const out = join(dirname(fileURLToPath(import.meta.url)), "../../../../eval/latency.md");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, md);
console.log(md);
