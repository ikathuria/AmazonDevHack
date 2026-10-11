// Background job queue. SQS in AWS; in-memory locally/tests (jobs run right after the response, like the worker would).
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

export type Job =
  | { kind: "plan_week"; householdId: string; weekOf: string; request?: string };

export interface Queue {
  send(job: Job): Promise<void>;
}

export class SqsQueue implements Queue {
  private sqs = new SQSClient({});
  constructor(private url: string) {}
  async send(job: Job) {
    await this.sqs.send(new SendMessageCommand({ QueueUrl: this.url, MessageBody: JSON.stringify(job) }));
  }
}

export class MemoryQueue implements Queue {
  readonly sent: Job[] = [];
  constructor(private runner?: (job: Job) => Promise<void>) {}
  async send(job: Job) {
    this.sent.push(job);
    if (this.runner) {
      const run = this.runner;
      setTimeout(() => void run(job).catch((e) => console.error("[memory-queue]", e)), 0);
    }
  }
}
