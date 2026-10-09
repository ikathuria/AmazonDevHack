// M0 spike: one MCP tool (bump_counter) over Streamable HTTP + an SSE feed the TV subscribes to.
// Storage is in-memory for the local/tunnel test; swapped for DynamoDB once AWS is set up.
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

type CounterEvent = { id: number; type: "counter"; value: number; label: string; at: string };

let counter = 0;
let nextEventId = 1;
const history: CounterEvent[] = [];
const subscribers = new Set<(e: CounterEvent) => void>();

export function bump(by: number, label: string): CounterEvent {
  counter += by;
  const event: CounterEvent = { id: nextEventId++, type: "counter", value: counter, label, at: new Date().toISOString() };
  history.push(event);
  if (history.length > 100) history.shift();
  for (const send of subscribers) send(event);
  return event;
}

function buildMcpServer(): McpServer {
  const server = new McpServer({ name: "homebase-spike", version: "0.0.1" });
  server.registerTool(
    "bump_counter",
    {
      title: "Bump the Homebase test counter",
      description: "Adds a number to the Homebase test counter shown on the family TV. Use when the user asks to bump, add to, or increase the Homebase counter.",
      inputSchema: { by: z.number().int().min(1).max(100).default(1), label: z.string().max(60).default("from Alexa") },
      annotations: { readOnlyHint: false, idempotentHint: false },
    },
    async ({ by, label }) => {
      const e = bump(by, label);
      return { content: [{ type: "text", text: `The Homebase counter is now ${e.value}.` }] };
    },
  );
  return server;
}

export const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, counter }));

// Stateless Streamable HTTP: a fresh server + transport per request keeps it Lambda-friendly.
app.all("/mcp", async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  const server = buildMcpServer();
  await server.connect(transport);
  const started = performance.now();
  const res = await transport.handleRequest(c.req.raw);
  console.log(`[mcp] ${c.req.method} ${(performance.now() - started).toFixed(1)}ms`);
  return res;
});

// SSE feed for the TV. Supports Last-Event-ID resume.
app.get("/events", (c) =>
  streamSSE(c, async (stream) => {
    const lastId = Number(c.req.header("Last-Event-ID") ?? 0);
    for (const e of history.filter((h) => h.id > lastId)) {
      await stream.writeSSE({ id: String(e.id), event: e.type, data: JSON.stringify(e) });
    }
    const send = (e: CounterEvent) => void stream.writeSSE({ id: String(e.id), event: e.type, data: JSON.stringify(e) });
    subscribers.add(send);
    stream.onAbort(() => { subscribers.delete(send); });
    while (!stream.aborted) {
      await stream.writeSSE({ event: "ping", data: String(Date.now()) });
      await stream.sleep(15_000);
    }
  }),
);
