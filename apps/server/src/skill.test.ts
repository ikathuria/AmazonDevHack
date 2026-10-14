import { describe, expect, it } from "vitest";
import * as Alexa from "ask-sdk-core";
import type { RequestEnvelope, ResponseEnvelope, Slot } from "ask-sdk-model";
import { createSkillHandlers, skillErrorHandler, INTENTS, resolved } from "./skill.js";
import { MemoryStore } from "./lib/store.js";
import { MemoryQueue } from "./lib/queue.js";
import { seedHousehold } from "./scripts/seed-data.js";
import { model } from "./scripts/build-skill-model.js";
import { allTools } from "./features/index.js";

async function skill() {
  const store = new MemoryStore();
  for (const { kind, doc } of seedHousehold.docs) await store.putDoc(seedHousehold.id, kind, doc);
  const ctx = { store, queue: new MemoryQueue(), householdId: "patels", now: () => new Date("2026-10-15T23:00:00Z") };
  const s = Alexa.SkillBuilders.custom().addRequestHandlers(...createSkillHandlers(() => ctx)).addErrorHandlers(skillErrorHandler).create();
  return { store, invoke: (env: RequestEnvelope) => s.invoke(env) as Promise<ResponseEnvelope> };
}

function intent(name: string, slots: Record<string, Partial<Slot> & { id?: string }> = {}): RequestEnvelope {
  const fullSlots = Object.fromEntries(Object.entries(slots).map(([k, sl]) => [k, {
    name: k, value: sl.value, confirmationStatus: "NONE",
    ...(sl.id ? { resolutions: { resolutionsPerAuthority: [{ authority: "x", status: { code: "ER_SUCCESS_MATCH" }, values: [{ value: { id: sl.id, name: sl.value } }] }] } } : {}),
  }]));
  return {
    version: "1.0",
    session: { new: false, sessionId: "s", application: { applicationId: "a" }, user: { userId: "u" } },
    context: { System: { application: { applicationId: "a" }, user: { userId: "u" }, device: { deviceId: "d", supportedInterfaces: {} }, apiEndpoint: "" } },
    request: { type: "IntentRequest", requestId: "r", timestamp: "2026-10-15T23:00:00Z", locale: "en-US", dialogState: "COMPLETED", intent: { name, confirmationStatus: "NONE", slots: fullSlots } },
  } as unknown as RequestEnvelope;
}
const speech = (r: ResponseEnvelope) => (r.response.outputSpeech as { ssml: string }).ssml.replace(/<\/?speak>/g, "");

describe("classic skill front end", () => {
  it("maps every intent to a real tool", () => {
    for (const m of Object.values(INTENTS)) expect(allTools.some((t) => t.name === m.tool)).toBe(true);
  });

  it("every custom intent in the interaction model has a handler", () => {
    const custom = model.interactionModel.languageModel.intents.map((i) => i.name).filter((n) => !n.startsWith("AMAZON."));
    for (const n of custom) expect(INTENTS[n], n).toBeDefined();
  });

  it("cancels and reroutes an unsafe dinner by voice, and records what was heard", async () => {
    const { store, invoke } = await skill();
    const r = await invoke(intent("SetDinnerIntent", { day: { value: "friday", id: "friday" }, recipe: { value: "peanut satay noodles", id: "peanut-noodles" } }));
    expect(speech(r)).toMatch(/^Not the peanut satay noodles\. Maya's allergic to peanuts/);
    expect(r.response.shouldEndSession).toBe(true);
    const types = (await store.eventsAfter("patels", 0, 50)).map((e) => e.event.type);
    expect(types).toEqual(expect.arrayContaining(["voice.heard", "plan.rerouted"]));
  });

  it("keeps the session open while cooking so 'next' works without re-invoking", async () => {
    const { invoke } = await skill();
    const start = await invoke(intent("StartCookingIntent", { recipe: { value: "chana masala", id: "chana-masala" } }));
    expect(speech(start)).toContain("Step 1 of 5");
    expect(start.response.shouldEndSession).toBeFalsy();
    const next = await invoke(intent("AMAZON.NextIntent"));
    expect(speech(next)).toContain("Step 2 of 5");
  });

  it("uses entity resolution ids (dairy → milk) for allergies", async () => {
    const { invoke } = await skill();
    const r = await invoke(intent("AddAllergyIntent", { member: { value: "arjun" }, allergen: { value: "dairy", id: "milk" } }));
    expect(speech(r)).toContain("Arjun (allergic to milk)");
  });

  it("falls back to the heard value when there's no resolution", () => {
    expect(resolved({ name: "x", value: "tonight", confirmationStatus: "NONE" })).toBe("tonight");
  });

  it("answers help and stop in the brand voice", async () => {
    const { invoke } = await skill();
    expect(speech(await invoke(intent("AMAZON.HelpIntent")))).toContain("plans dinners");
    expect(speech(await invoke(intent("AMAZON.StopIntent")))).toContain("The board stays on your TV");
  });
});
