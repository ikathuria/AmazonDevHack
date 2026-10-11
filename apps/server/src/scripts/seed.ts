// Writes the demo household to DynamoDB. Idempotent: puts overwrite the same keys.
// Usage: TABLE_NAME=<table> npm run seed
import { DynamoStore } from "../lib/store.js";
import { seedHousehold } from "./seed-data.js";

const table = process.env.TABLE_NAME;
if (!table) {
  console.error("TABLE_NAME is required (see the CDK output HomebaseStack.TableName).");
  process.exit(1);
}
const store = new DynamoStore(table);
await store.putMany(seedHousehold.id, seedHousehold.docs);
const recipes = await store.listDocs(seedHousehold.id, "RECIPE#");
console.log(`seeded ${seedHousehold.id}:`, seedHousehold.counts, `recipes in table: ${recipes.length}`);
