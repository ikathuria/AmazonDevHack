import { describe, expect, it } from "vitest";
import { Household, HomebaseEvent, Recipe } from "./index.js";

const household = {
  id: "patels",
  name: "The Patels",
  members: [{ id: "maya", name: "Maya", role: "child", allergies: ["peanut"] }],
  dayRules: { tue: "vegetarian" },
};

describe("contracts", () => {
  it("parses a valid household and fills defaults", () => {
    const h = Household.parse(household);
    expect(h.members[0].diets).toEqual([]);
    expect(h.timezone).toBe("America/Chicago");
  });

  it("rejects an unknown allergen", () => {
    const bad = { ...household, members: [{ ...household.members[0], allergies: ["peanutz"] }] };
    expect(Household.safeParse(bad).success).toBe(false);
  });

  it("rejects a household with no members", () => {
    expect(Household.safeParse({ ...household, members: [] }).success).toBe(false);
  });

  it("requires at least one step and ingredient in a recipe", () => {
    expect(Recipe.safeParse({ id: "r", title: "x", minutes: 10, ingredients: [], steps: [] }).success).toBe(false);
  });

  it("accepts a plan.rerouted event with or without a replacement", () => {
    const base = { type: "plan.rerouted", day: "fri", cancelled: { title: "Peanut satay noodles", reason: "peanut" } };
    expect(HomebaseEvent.safeParse({ ...base, replacement: { recipeId: "spinach-pasta", title: "Garlic spinach pasta" } }).success).toBe(true);
    expect(HomebaseEvent.safeParse({ ...base, replacement: null }).success).toBe(true);
  });

  it("discriminates events by type", () => {
    const e = HomebaseEvent.parse({ type: "voice.heard", utterance: "next step" });
    expect(e.type).toBe("voice.heard");
    expect(HomebaseEvent.safeParse({ type: "nope" }).success).toBe(false);
  });
});
