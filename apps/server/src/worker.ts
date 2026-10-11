// SQS worker for slow jobs (Bedrock meal planning). Kept out of the MCP request path (Alexa+ 500 ms budget).
import type { SQSEvent } from "aws-lambda";
import type { Job } from "./lib/queue.js";
import { storeFromEnv } from "./lib/store.js";
import { bedrockLlm } from "./lib/llm.js";
import { runJob } from "./jobs.js";

const store = storeFromEnv();
const llm = bedrockLlm();

export async function handler(event: SQSEvent) {
  for (const record of event.Records) {
    // A throw sends the message back to the queue; after 3 tries it lands in the DLQ.
    await runJob(JSON.parse(record.body) as Job, store, llm);
  }
}
