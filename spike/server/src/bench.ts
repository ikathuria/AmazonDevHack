// Calls bump_counter N times through a real MCP client and reports round-trip latency.
// Usage: npx tsx src/bench.ts [baseUrl] [n]
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const base = process.argv[2] ?? "http://localhost:8787";
const n = Number(process.argv[3] ?? 20);

const client = new Client({ name: "homebase-bench", version: "0.0.1" });
await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
const { tools } = await client.listTools();
console.log("tools:", tools.map((t) => t.name).join(", "));

const times: number[] = [];
let last = "";
for (let i = 0; i < n; i++) {
  const t0 = performance.now();
  const r = await client.callTool({ name: "bump_counter", arguments: { by: 1, label: `bench ${i}` } });
  times.push(performance.now() - t0);
  last = (r.content as { text: string }[])[0].text;
}
times.sort((a, b) => a - b);
const pct = (p: number) => times[Math.min(times.length - 1, Math.floor((p / 100) * times.length))].toFixed(1);
console.log(`last reply: ${last}`);
console.log(`n=${n} p50=${pct(50)}ms p95=${pct(95)}ms max=${times.at(-1)!.toFixed(1)}ms (budget 500ms)`);
await client.close();
