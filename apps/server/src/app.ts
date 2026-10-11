// Homebase HTTP app: MCP endpoint (Alexa+ / simulator), SSE event feed (TV + web board), health.
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Store } from "./lib/store.js";
import { registerHouseholdTools } from "./features/household/tools.js";

export type AppOptions = {
  store: Store;
  // Until account linking exists (PLAN.md M5), every MCP call acts on the demo household.
  demoHouseholdId: string;
  // How often an SSE connection checks the store for new events. Lambda invocations can't share memory, so we poll.
  pollMs?: number;
  // Max lifetime of one SSE response before the client reconnects with Last-Event-ID (Lambda max is 15 min).
  streamMaxMs?: number;
};

export function buildMcpServer(store: Store, householdId: string): McpServer {
  const server = new McpServer({ name: "homebase", version: "0.1.0" });
  registerHouseholdTools(server, store, householdId);
  return server;
}

export function createApp({ store, demoHouseholdId, pollMs = 1000, streamMaxMs = 10 * 60_000 }: AppOptions) {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true, service: "homebase" }));

  // Stateless Streamable HTTP: fresh server + transport per request (Lambda-friendly).
  app.all("/mcp", async (c) => {
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await buildMcpServer(store, demoHouseholdId).connect(transport);
    return transport.handleRequest(c.req.raw);
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
