import { streamHandle } from "hono/aws-lambda";
import { createApp } from "./app.js";
import { storeFromEnv } from "./lib/store.js";

const app = createApp({ store: storeFromEnv(), demoHouseholdId: process.env.DEMO_HOUSEHOLD_ID ?? "patels" });

// RESPONSE_STREAM invoke mode on the Function URL is required for SSE.
export const handler = streamHandle(app);
