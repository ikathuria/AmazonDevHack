import { streamHandle } from "hono/aws-lambda";
import { createApp } from "./app.js";
import { storeFromEnv } from "./lib/store.js";
import { SqsQueue } from "./lib/queue.js";
import { bedrockChatModel } from "./lib/agent.js";

const app = createApp({
  store: storeFromEnv(),
  queue: new SqsQueue(process.env.PLAN_QUEUE_URL!),
  demoHouseholdId: process.env.DEMO_HOUSEHOLD_ID ?? "patels",
  chatModel: bedrockChatModel(),
});

// RESPONSE_STREAM invoke mode on the Function URL is required for SSE.
// The EventBridge warm-up rule sends a Function-URL-shaped GET /health, so no special casing is needed here.
export const handler = streamHandle(app);
