// Deterministic allergen + diet checks. LLM-generated recipes never reach a household without passing this.
// Two signals, either one blocks: the ingredient's declared allergen tags, and keyword/synonym matching on its name
// (LLMs mislabel tags, so names are always checked too). Not a medical guarantee; the README says so.
import type { Allergen, Diet, Household, Recipe, Weekday } from "../../lib/contracts.js";

// Keywords are matched as whole words/phrases on the lowercased ingredient name.
const ALLERGEN_KEYWORDS: Record<Allergen, string[]> = {
  peanut: ["peanut", "peanuts", "groundnut", "groundnuts", "goober", "monkey nut", "arachis", "satay", "goobers"],
  tree_nut: ["almond", "almonds", "cashew", "cashews", "walnut", "walnuts", "pecan", "pecans", "pistachio", "pistachios", "hazelnut", "hazelnuts", "macadamia", "brazil nut", "pine nut", "pine nuts", "praline", "marzipan", "frangipane", "nutella", "gianduja"],
  milk: ["milk", "butter", "ghee", "cheese", "cheddar", "mozzarella", "parmesan", "paneer", "cream", "yogurt", "yoghurt", "curd", "whey", "casein", "buttermilk", "custard", "kefir", "labneh", "ricotta"],
  egg: ["egg", "eggs", "mayonnaise", "mayo", "meringue", "aioli", "albumen"],
  wheat: ["wheat", "flour", "bread", "breadcrumbs", "pasta", "noodles", "couscous", "semolina", "tortilla", "tortillas", "naan", "roti", "chapati", "seitan", "bulgur", "farro", "spelt"],
  gluten: ["wheat", "flour", "bread", "breadcrumbs", "pasta", "noodles", "couscous", "semolina", "tortilla", "tortillas", "naan", "roti", "chapati", "seitan", "bulgur", "barley", "rye", "malt", "farro", "spelt"],
  soy: ["soy", "soya", "tofu", "tempeh", "edamame", "miso", "tamari", "shoyu"],
  fish: ["fish", "salmon", "tuna", "cod", "anchovy", "anchovies", "sardine", "sardines", "tilapia", "haddock", "mackerel", "trout", "fish sauce"],
  shellfish: ["shrimp", "prawn", "prawns", "crab", "lobster", "scallop", "scallops", "clam", "clams", "mussel", "mussels", "oyster", "oysters", "crayfish"],
  sesame: ["sesame", "tahini", "benne", "gingelly", "halva", "halvah"],
};

// Names that contain a keyword but are not the allergen.
const FALSE_FRIENDS = ["coconut milk", "almond-free", "nut-free", "dairy-free", "egg-free", "butternut", "nutmeg", "water chestnut", "cream of tartar", "peanut-free", "rice noodles", "rice flour", "gluten-free"];

const MEAT_KEYWORDS = ["chicken", "beef", "pork", "lamb", "mutton", "goat", "bacon", "ham", "sausage", "turkey", "duck", "veal", "chorizo", "pepperoni", "salami", "prosciutto", "gelatin", "lard"];
const PORK_KEYWORDS = ["pork", "bacon", "ham", "chorizo", "pepperoni", "salami", "prosciutto", "lard", "gelatin"];

function containsPhrase(text: string, phrase: string) {
  return new RegExp(`(^|[^a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(text);
}

function cleanName(name: string) {
  let s = name.toLowerCase();
  for (const f of FALSE_FRIENDS) s = s.replaceAll(f, " ");
  return s;
}

export function ingredientAllergens(ingredient: { name: string; allergens?: Allergen[] }): Allergen[] {
  const found = new Set<Allergen>(ingredient.allergens ?? []);
  const name = cleanName(ingredient.name);
  for (const [allergen, words] of Object.entries(ALLERGEN_KEYWORDS) as [Allergen, string[]][]) {
    if (words.some((w) => containsPhrase(name, w))) found.add(allergen);
  }
  return [...found];
}

function dietViolation(recipe: Recipe, diet: Diet): string | undefined {
  const names = recipe.ingredients.map((i) => cleanName(i.name));
  const has = (words: string[]) => names.find((n) => words.some((w) => containsPhrase(n, w)));
  const allergensOf = (a: Allergen) => recipe.ingredients.some((i) => ingredientAllergens(i).includes(a));
  switch (diet) {
    case "vegetarian": {
      const meat = has(MEAT_KEYWORDS) ?? has(ALLERGEN_KEYWORDS.fish) ?? has(ALLERGEN_KEYWORDS.shellfish);
      return meat ? `contains ${meat}` : undefined;
    }
    case "vegan": {
      const animal = has([...MEAT_KEYWORDS, ...ALLERGEN_KEYWORDS.fish, ...ALLERGEN_KEYWORDS.shellfish, ...ALLERGEN_KEYWORDS.milk, ...ALLERGEN_KEYWORDS.egg, "honey"]);
      return animal ? `contains ${animal}` : undefined;
    }
    case "pescatarian": {
      const meat = has(MEAT_KEYWORDS);
      return meat ? `contains ${meat}` : undefined;
    }
    case "halal":
    case "kosher": {
      const pork = has(PORK_KEYWORDS);
      return pork ? `contains ${pork}` : undefined;
    }
    case "dairy_free":
      return allergensOf("milk") ? "contains dairy" : undefined;
    case "gluten_free":
      return allergensOf("gluten") ? "contains gluten" : undefined;
  }
}

export type Verdict = { ok: boolean; reasons: string[] };

// day: when the recipe is planned for, so day rules like "vegetarian Tuesdays" apply.
export function verifyRecipe(recipe: Recipe, household: Household, day?: Weekday): Verdict {
  const reasons: string[] = [];
  for (const member of household.members) {
    for (const ing of recipe.ingredients) {
      const hits = ingredientAllergens(ing).filter((a) => member.allergies.includes(a));
      for (const a of hits) reasons.push(`${ing.name} contains ${a.replace("_", " ")} and ${member.name} is allergic`);
    }
    for (const diet of member.diets) {
      const v = dietViolation(recipe, diet);
      if (v) reasons.push(`${member.name} is ${diet.replace("_", " ")} and it ${v}`);
    }
  }
  const rule = day ? household.dayRules[day] : undefined;
  if (rule) {
    const v = dietViolation(recipe, rule);
    if (v) reasons.push(`${day} is ${rule.replace("_", " ")} and it ${v}`);
  }
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}
