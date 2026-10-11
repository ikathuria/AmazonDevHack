// Local dev server. Without TABLE_NAME it uses the in-memory store pre-loaded with the demo household.
// Background jobs run in-process. Set LOCAL_LLM=1 to call Bedrock for meal plans (otherwise the deterministic planner runs).
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { MemoryStore, storeFromEnv } from "./lib/store.js";
import { MemoryQueue } from "./lib/queue.js";
import { bedrockLlm } from "./lib/llm.js";
import { bedrockChatModel } from "./lib/agent.js";
import { runJob } from "./jobs.js";
import { seedHousehold } from "./scripts/seed-data.js";

const store = storeFromEnv();
const demoHouseholdId = process.env.DEMO_HOUSEHOLD_ID ?? "patels";
if (store instanceof MemoryStore) {
  for (const { kind, doc } of seedHousehold.docs) await store.putDoc(seedHousehold.id, kind, doc);
}
const llm = process.env.LOCAL_LLM === "1" ? bedrockLlm() : undefined;
const queue = new MemoryQueue((job) => runJob(job, store, llm));

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: createApp({ store, queue, demoHouseholdId, chatModel: llm ? bedrockChatModel() : undefined }).fetch, port }, () =>
  console.log(`homebase server on http://localhost:${port} (${store instanceof MemoryStore ? "memory" : "dynamodb"} store, planner: ${llm ? "bedrock" : "deterministic"})`),
);
