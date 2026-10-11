// Homebase HTTP app: MCP endpoint (Alexa+), REST tool calls (TV D-pad / web), state snapshot, SSE event feed.
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Store } from "./lib/store.js";
import type { Queue } from "./lib/queue.js";
import { registerMcpTools, runTool, type ToolContext } from "./lib/tools.js";
import { docs } from "./lib/docs.js";
import { allTools } from "./features/index.js";

export type AppOptions = {
  store: Store;
  queue: Queue;
  // Until account linking exists (PLAN.md M5), every call acts on the demo household.
  demoHouseholdId: string;
  now?: () => Date;
  // How often an SSE connection checks the store for new events. Lambda invocations can't share memory, so we poll.
  pollMs?: number;
  // Max lifetime of one SSE response before the client reconnects with Last-Event-ID (Lambda max is 15 min).
  streamMaxMs?: number;
};

export function createApp({ store, queue, demoHouseholdId, now = () => new Date(), pollMs = 1000, streamMaxMs = 10 * 60_000 }: AppOptions) {
  const app = new Hono();
  const ctxFor = (householdId = demoHouseholdId): ToolContext => ({ store, queue, householdId, now });

  // Function URL CORS covers AWS; this covers local dev.
  app.use("/api/*", cors());
  app.use("/households/*", cors());

  app.get("/health", (c) => c.json({ ok: true, service: "homebase" }));

  // Stateless Streamable HTTP: fresh server + transport per request (Lambda-friendly).
  app.all("/mcp", async (c) => {
    const server = new McpServer({ name: "homebase", version: "0.2.0" });
    registerMcpTools(server, allTools, ctxFor());
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });

  // Same tools over plain REST, for the TV's D-pad and the web app's buttons.
  app.get("/api/tools", (c) => c.json(allTools.map((t) => ({ name: t.name, title: t.title, readOnly: !!t.readOnly }))));
  app.post("/api/tools/:name", async (c) => {
    const tool = allTools.find((t) => t.name === c.req.param("name"));
    if (!tool) return c.json({ error: "unknown tool" }, 404);
    const args = await c.req.json().catch(() => ({}));
    const r = await runTool(tool, ctxFor(), args);
    return c.json(r, r.isError ? 400 : 200);
  });

  // Full snapshot for a TV/board on first load; afterwards it follows the SSE feed.
  app.get("/households/:id/state", async (c) => {
    const d = docs(ctxFor(c.req.param("id")));
    const [household, plan, choreState, chores, cook, shopping, latest] = await Promise.all([
      d.household(), d.plan(), d.choreState(), d.chores(), d.cook(), d.shopping(), store.eventsAfter(c.req.param("id"), 0, 1000),
    ]);
    if (!household) return c.json({ error: "household not found" }, 404);
    const recipe = cook ? await d.recipe(cook.recipeId) : undefined;
    return c.json({ household, plan: plan ?? null, chores, choreAssignments: choreState?.assignments ?? [], cook: cook ? { session: cook, recipe } : null, shopping, lastSeq: latest.at(-1)?.seq ?? 0 });
  });

  // SSE feed. Resumes from Last-Event-ID (header) or ?after= (query, for clients that can't set headers).
  app.get("/households/:id/events", (c) => {
    const householdId = c.req.param("id");
    let cursor = Number(c.req.header("Last-Event-ID") ?? c.req.query("after") ?? 0) || 0;
    return streamSSE(c, async (stream) => {
      const deadline = Date.now() + streamMaxMs;
      let lastPing = 0;
      while (!stream.aborted && Date.now() < deadline) {
        for (const e of await store.eventsAfter(householdId, cursor)) {
          await stream.writeSSE({ id: String(e.seq), event: e.event.type, data: JSON.stringify(e) });
          cursor = e.seq;
        }
        if (Date.now() - lastPing > 15_000) {
          await stream.writeSSE({ event: "ping", data: String(Date.now()) });
          lastPing = Date.now();
        }
        await stream.sleep(pollMs);
      }
    });
  });

  return app;
}
