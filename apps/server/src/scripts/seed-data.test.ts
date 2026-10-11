import { describe, expect, it } from "vitest";
import { MemoryStore } from "../lib/store.js";
import { seedHousehold } from "./seed-data.js";

describe("seed data", () => {
  it("has the demo household shape the plan and video rely on", () => {
    expect(seedHousehold.counts).toEqual({ members: 3, pantry: 20, chores: 6, recipes: 12 });
  });

  it("includes the peanut recipe the allergen verifier must block", () => {
    const kinds = seedHousehold.docs.map((d) => d.kind);
    expect(kinds).toContain("RECIPE#peanut-noodles");
  });

  it("is idempotent: seeding twice leaves the same number of docs", async () => {
    const store = new MemoryStore();
    for (let run = 0; run < 2; run++) {
      for (const { kind, doc } of seedHousehold.docs) await store.putDoc(seedHousehold.id, kind, doc);
    }
    expect(await store.listDocs(seedHousehold.id, "RECIPE#")).toHaveLength(12);
  });
});
