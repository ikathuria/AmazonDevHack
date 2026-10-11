// Local dev server. Without TABLE_NAME it uses the in-memory store pre-loaded with the demo household.
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { MemoryStore, storeFromEnv } from "./lib/store.js";
import { seedHousehold } from "./scripts/seed-data.js";

const store = storeFromEnv();
const demoHouseholdId = process.env.DEMO_HOUSEHOLD_ID ?? "patels";
if (store instanceof MemoryStore) {
  for (const { kind, doc } of seedHousehold.docs) await store.putDoc(seedHousehold.id, kind, doc);
}

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: createApp({ store, demoHouseholdId }).fetch, port }, () =>
  console.log(`homebase server on http://localhost:${port} (${store instanceof MemoryStore ? "memory" : "dynamodb"} store)`),
);
