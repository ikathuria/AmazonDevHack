// Storage interface + two implementations: in-memory (local dev/tests) and DynamoDB (Lambda).
// Single-table layout: pk = HH#<householdId>; sk = PROFILE | PANTRY | CHORES | RECIPE#<id> | META | EVT#<seq, zero-padded>.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { HomebaseEvent, StoredEvent } from "./contracts.js";

export type DocKind = "PROFILE" | "PANTRY" | "CHORES" | "CHORE_STATE" | "PLAN" | "SHOPPING" | "COOK" | `RECIPE#${string}`;

export interface Store {
  getDoc<T>(householdId: string, kind: DocKind): Promise<T | undefined>;
  putDoc<T>(householdId: string, kind: DocKind, doc: T): Promise<void>;
  listDocs<T>(householdId: string, prefix: string): Promise<T[]>;
  appendEvent(householdId: string, event: HomebaseEvent): Promise<StoredEvent>;
  eventsAfter(householdId: string, seq: number, limit?: number): Promise<StoredEvent[]>;
}

const pk = (householdId: string) => `HH#${householdId}`;
const evtSk = (seq: number) => `EVT#${String(seq).padStart(10, "0")}`;

export class MemoryStore implements Store {
  private docs = new Map<string, unknown>();
  private events = new Map<string, StoredEvent[]>();

  async getDoc<T>(householdId: string, kind: DocKind) {
    return structuredClone(this.docs.get(`${pk(householdId)}|${kind}`)) as T | undefined;
  }
  async putDoc<T>(householdId: string, kind: DocKind, doc: T) {
    this.docs.set(`${pk(householdId)}|${kind}`, structuredClone(doc));
  }
  async listDocs<T>(householdId: string, prefix: string) {
    const start = `${pk(householdId)}|${prefix}`;
    return [...this.docs.entries()].filter(([k]) => k.startsWith(start)).map(([, v]) => structuredClone(v) as T);
  }
  async appendEvent(householdId: string, event: HomebaseEvent) {
    const list = this.events.get(householdId) ?? [];
    const stored: StoredEvent = { seq: list.length + 1, at: new Date().toISOString(), event };
    list.push(stored);
    this.events.set(householdId, list);
    return stored;
  }
  async eventsAfter(householdId: string, seq: number, limit = 50) {
    return (this.events.get(householdId) ?? []).filter((e) => e.seq > seq).slice(0, limit);
  }
}

export class DynamoStore implements Store {
  private db: DynamoDBDocumentClient;
  constructor(private table: string, client = new DynamoDBClient({})) {
    this.db = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
  }

  async getDoc<T>(householdId: string, kind: DocKind) {
    const r = await this.db.send(new GetCommand({ TableName: this.table, Key: { pk: pk(householdId), sk: kind } }));
    return r.Item?.doc as T | undefined;
  }
  async putDoc<T>(householdId: string, kind: DocKind, doc: T) {
    await this.db.send(new PutCommand({ TableName: this.table, Item: { pk: pk(householdId), sk: kind, doc } }));
  }
  async listDocs<T>(householdId: string, prefix: string) {
    const r = await this.db.send(new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :p)",
      ExpressionAttributeValues: { ":pk": pk(householdId), ":p": prefix },
    }));
    return (r.Items ?? []).map((i) => i.doc as T);
  }
  async appendEvent(householdId: string, event: HomebaseEvent) {
    // Atomic per-household sequence counter, then write the event under its seq.
    const r = await this.db.send(new UpdateCommand({
      TableName: this.table,
      Key: { pk: pk(householdId), sk: "META" },
      UpdateExpression: "ADD seq :one",
      ExpressionAttributeValues: { ":one": 1 },
      ReturnValues: "UPDATED_NEW",
    }));
    const stored: StoredEvent = { seq: Number(r.Attributes?.seq), at: new Date().toISOString(), event };
    // Events expire after 7 days; the TV only needs recent history to resume.
    const ttl = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    await this.db.send(new PutCommand({ TableName: this.table, Item: { pk: pk(householdId), sk: evtSk(stored.seq), doc: stored, ttl } }));
    return stored;
  }
  async eventsAfter(householdId: string, seq: number, limit = 50) {
    const r = await this.db.send(new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: "pk = :pk AND sk BETWEEN :from AND :to",
      ExpressionAttributeValues: { ":pk": pk(householdId), ":from": evtSk(seq + 1), ":to": evtSk(9_999_999_999) },
      Limit: limit,
    }));
    return (r.Items ?? []).map((i) => i.doc as StoredEvent);
  }

  // Used by the seed script only.
  async putMany(householdId: string, items: { kind: DocKind; doc: unknown }[]) {
    for (let i = 0; i < items.length; i += 25) {
      await this.db.send(new BatchWriteCommand({
        RequestItems: { [this.table]: items.slice(i, i + 25).map(({ kind, doc }) => ({ PutRequest: { Item: { pk: pk(householdId), sk: kind, doc } } })) },
      }));
    }
  }
}

export function storeFromEnv(): Store {
  return process.env.TABLE_NAME ? new DynamoStore(process.env.TABLE_NAME) : new MemoryStore();
}
