// SQS worker for slow jobs (Bedrock meal planning, chore explanations). M2 adds the plan_week job.
// Kept separate from the MCP request path so tools stay under Alexa+'s 500 ms budget.
import type { SQSEvent } from "aws-lambda";

export type Job = { kind: "plan_week"; householdId: string; weekOf: string };

export async function handler(event: SQSEvent) {
  for (const record of event.Records) {
    const job = JSON.parse(record.body) as Job;
    // Unknown jobs throw so they land in the DLQ instead of disappearing.
    throw new Error(`No handler for job kind "${job.kind}" yet (M2).`);
  }
}
