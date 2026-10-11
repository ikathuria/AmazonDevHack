import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "./app.js";
import { MemoryStore } from "./lib/store.js";
import { MemoryQueue } from "./lib/queue.js";
import { seedHousehold } from "./scripts/seed-data.js";

async function seededStore() {
  const store = new MemoryStore();
  for (const { kind, doc } of seedHousehold.docs) await store.putDoc(seedHousehold.id, kind, doc);
  return store;
}

// Route the MCP client's fetch straight into the Hono app (no network).
function mcpClientFor(app: ReturnType<typeof createApp>) {
  const transport = new StreamableHTTPClientTransport(new URL("http://test/mcp"), {
    fetch: async (input, init) => app.fetch(new Request(input, init)),
  });
  return { client: new Client({ name: "test", version: "0" }), transport };
}

describe("server app", () => {
  it("serves /health", async () => {
    const app = createApp({ store: new MemoryStore(), queue: new MemoryQueue(), demoHouseholdId: "patels" });
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, service: "homebase" });
  });

  it("answers get_household over MCP with the seeded household", async () => {
    const app = createApp({ store: await seededStore(), queue: new MemoryQueue(), demoHouseholdId: "patels" });
    const { client, transport } = mcpClientFor(app);
    await client.connect(transport);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("get_household");
    const r = await client.callTool({ name: "get_household", arguments: {} });
    const text = (r.content as { text: string }[])[0].text;
    expect(text).toContain("Maya (allergic to peanut)");
    expect(text).toContain("vegetarian on tue");
    await client.close();
  });

  it("returns an error result when the household doesn't exist", async () => {
    const app = createApp({ store: new MemoryStore(), queue: new MemoryQueue(), demoHouseholdId: "nobody" });
    const { client, transport } = mcpClientFor(app);
    await client.connect(transport);
    const r = await client.callTool({ name: "get_household", arguments: {} });
    expect(r.isError).toBe(true);
    await client.close();
  });

  it("streams stored events over SSE and resumes after Last-Event-ID", async () => {
    const store = new MemoryStore();
    await store.appendEvent("patels", { type: "voice.heard", utterance: "first" });
    await store.appendEvent("patels", { type: "voice.heard", utterance: "second" });
    const app = createApp({ store, queue: new MemoryQueue(), demoHouseholdId: "patels", pollMs: 10, streamMaxMs: 50 });
    const res = await app.request("/households/patels/events", { headers: { "Last-Event-ID": "1" } });
    const body = await res.text();
    expect(body).toContain("id: 2");
    expect(body).toContain("second");
    expect(body).not.toContain("first");
  });
});

describe("simulated Alexa+", () => {
  it("serves the simulator page", async () => {
    const app = createApp({ store: new MemoryStore(), queue: new MemoryQueue(), demoHouseholdId: "patels" });
    const res = await app.request("/sim");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Alexa+ simulator");
  });

  it("returns 503 when no chat model is configured", async () => {
    const app = createApp({ store: new MemoryStore(), queue: new MemoryQueue(), demoHouseholdId: "patels" });
    const res = await app.request("/api/sim/converse", { method: "POST", body: JSON.stringify({ utterance: "hi" }) });
    expect(res.status).toBe(503);
  });

  it("runs a turn through the agent and records what Alexa heard", async () => {
    const store = await seededStore();
    const model = async () => ({ role: "assistant" as const, content: [{ text: "Hello from the simulator." }] });
    const app = createApp({ store, queue: new MemoryQueue(), demoHouseholdId: "patels", chatModel: model });
    const res = await app.request("/api/sim/converse", { method: "POST", body: JSON.stringify({ utterance: "hello" }) });
    expect((await res.json()).reply).toBe("Hello from the simulator.");
    const events = await store.eventsAfter("patels", 0);
    expect(events[0].event).toEqual({ type: "voice.heard", utterance: "hello" });
  });
});
