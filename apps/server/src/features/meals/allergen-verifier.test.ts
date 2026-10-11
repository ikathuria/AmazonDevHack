import { describe, expect, it } from "vitest";
import { Household, Recipe, type Allergen } from "../../lib/contracts.js";
import { ingredientAllergens, verifyRecipe } from "./allergen-verifier.js";

const recipe = (names: string[], tags: Allergen[][] = []) =>
  Recipe.parse({ id: "r", title: "Test", minutes: 10, ingredients: names.map((name, i) => ({ name, allergens: tags[i] ?? [] })), steps: [{ text: "cook" }] });

const household = (allergies: Allergen[] = [], diets: string[] = [], dayRules = {}) =>
  Household.parse({ id: "h", name: "H", members: [{ id: "m", name: "Maya", role: "child", allergies, diets }], dayRules });

// [allergy, ingredient name, should block]
const allergyCases: [Allergen, string, boolean][] = [
  ["peanut", "peanut butter", true],
  ["peanut", "roasted peanuts", true],
  ["peanut", "chickpeas", false],
  ["tree_nut", "toasted almonds", true],
  ["tree_nut", "nutmeg", false],
  ["tree_nut", "butternut squash", false],
  ["milk", "paneer", true],
  ["milk", "coconut milk", false],
  ["egg", "eggplant", false],
  ["egg", "mayonnaise", true],
  ["gluten", "rice noodles", false],
  ["gluten", "pearl barley", true],
  ["wheat", "flour tortillas", true],
  ["soy", "firm tofu", true],
  ["fish", "anchovy fillets", true],
  ["shellfish", "king prawns", true],
  ["sesame", "toasted sesame oil", true],
  ["sesame", "olive oil", false],
  ["milk", "cream of tartar", false],
  ["egg", "fried eggs", true],
];

// Adversarial: synonyms and disguised names an LLM might use.
const adversarial: [Allergen, string][] = [
  ["peanut", "groundnut oil"],
  ["peanut", "satay sauce"],
  ["peanut", "arachis oil"],
  ["peanut", "monkey nut crumble"],
  ["tree_nut", "marzipan"],
  ["tree_nut", "praline topping"],
  ["milk", "ghee"],
  ["milk", "whey protein"],
  ["sesame", "tahini dressing"],
  ["soy", "tamari"],
];

describe("allergen verifier", () => {
  it.each(allergyCases)("%s allergy vs %s → blocked=%s", (allergy, name, blocked) => {
    expect(verifyRecipe(recipe([name]), household([allergy])).ok).toBe(!blocked);
  });

  it.each(adversarial)("%s allergy catches disguised ingredient %s", (allergy, name) => {
    expect(verifyRecipe(recipe([name]), household([allergy])).ok).toBe(false);
  });

  it("trusts declared tags even when the name looks safe", () => {
    expect(verifyRecipe(recipe(["secret sauce"], [["peanut"]]), household(["peanut"])).ok).toBe(false);
  });

  it("names the member and ingredient in the reason", () => {
    const v = verifyRecipe(recipe(["peanut butter"]), household(["peanut"]));
    expect(v.reasons[0]).toBe("peanut butter contains peanut and Maya is allergic");
  });

  it("applies day rules like vegetarian Tuesdays", () => {
    const h = household([], [], { tue: "vegetarian" });
    expect(verifyRecipe(recipe(["chicken thighs"]), h, "tue").ok).toBe(false);
    expect(verifyRecipe(recipe(["chicken thighs"]), h, "wed").ok).toBe(true);
  });

  it("applies member diets", () => {
    expect(verifyRecipe(recipe(["bacon"]), household([], ["halal"])).ok).toBe(false);
    expect(verifyRecipe(recipe(["butter"]), household([], ["vegan"])).ok).toBe(false);
    expect(verifyRecipe(recipe(["salmon"]), household([], ["pescatarian"])).ok).toBe(true);
  });

  it("detects multiple allergens in one ingredient", () => {
    expect(ingredientAllergens({ name: "soy sauce", allergens: ["wheat"] }).sort()).toEqual(["soy", "wheat"]);
  });
});
