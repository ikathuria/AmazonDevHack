// Drives the demo journey against a deployed server over MCP and reports per-tool latency.
// Usage: npm --prefix apps/server run journey -- <serverUrl>
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");
const client = new Client({ name: "homebase-live-journey", version: "0" });
await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));

const timings: [string, number][] = [];
async function call(name: string, args: Record<string, unknown> = {}) {
  const t0 = performance.now();
  const r = await client.callTool({ name, arguments: args });
  const ms = performance.now() - t0;
  timings.push([name, ms]);
  const text = (r.content as { text: string }[])[0].text;
  console.log(`${name.padEnd(26)} ${ms.toFixed(0).padStart(5)}ms  ${text.slice(0, 140)}`);
  return text;
}

await call("get_household");
await call("plan_week", { request: "something quick on Wednesday" });
let plan = "";
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 1500));
  plan = await call("get_plan", { day: "week" });
  if (!plan.includes("still drafting")) break;
}
await call("set_dinner", { day: "friday", recipe: "peanut noodles" });
await call("assign_chores");
await call("whos_on", { chore: "dishes", day: "tonight" });
await call("start_cooking", { recipe: "chana masala" });
await call("next_step");
await call("start_timer");
await call("shopping_list");

const ms = timings.map(([, t]) => t).sort((a, b) => a - b);
const pct = (p: number) => ms[Math.min(ms.length - 1, Math.floor((p / 100) * ms.length))].toFixed(0);
console.log(`\n${ms.length} calls  p50=${pct(50)}ms  p95=${pct(95)}ms  max=${ms.at(-1)!.toFixed(0)}ms  (Alexa+ budget 500ms)`);
await client.close();
