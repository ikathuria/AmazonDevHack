// Lambda entry for the classic "home base" skill. Same store/queue as the MCP server; acts on the demo household.
import * as Alexa from "ask-sdk-core";
import type { RequestEnvelope } from "ask-sdk-model";
import { createSkillHandlers, skillErrorHandler } from "./skill.js";
import { storeFromEnv } from "./lib/store.js";
import { SqsQueue } from "./lib/queue.js";

const store = storeFromEnv();
const queue = new SqsQueue(process.env.PLAN_QUEUE_URL!);
const householdId = process.env.DEMO_HOUSEHOLD_ID ?? "patels";

const builder = Alexa.SkillBuilders.custom()
  .addRequestHandlers(...createSkillHandlers(() => ({ store, queue, householdId, now: () => new Date() })))
  .addErrorHandlers(skillErrorHandler);
// Reject requests from any other skill once the skill ID is known (set via CDK context after `create-skill`).
if (process.env.SKILL_ID) builder.withSkillId(process.env.SKILL_ID);

// Node 24 Lambdas reject callback-style handlers, which is what the SDK's .lambda() returns; invoke the skill from an async handler.
const skill = builder.create();
export const handler = async (event: RequestEnvelope, context: unknown) => skill.invoke(event, context);
