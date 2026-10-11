// Demo household "The Patels". Never delete or thin this out: the demo video and evals depend on it.
import { Chore, Household, PantryItem, Recipe } from "../lib/contracts.js";
import type { DocKind } from "../lib/store.js";

const household = Household.parse({
  id: "patels",
  name: "The Patels",
  members: [
    { id: "priya", name: "Priya", role: "adult", dislikes: ["mushrooms"] },
    { id: "arjun", name: "Arjun", role: "adult" },
    { id: "maya", name: "Maya", role: "child", allergies: ["peanut"] },
  ],
  dayRules: { tue: "vegetarian" },
});

const pantry: PantryItem[] = [
  "basmati rice", "pasta", "olive oil", "onions", "garlic", "ginger", "canned tomatoes", "chickpeas",
  "red lentils", "eggs", "milk", "butter", "cheddar", "frozen peas", "spinach", "potatoes",
  "cumin", "garam masala", "soy sauce", "flour tortillas",
].map((name) => PantryItem.parse({ name }));

const chores: Chore[] = [
  { id: "dishes", name: "dishes", effort: 2, frequency: "daily" },
  { id: "cook", name: "cooking dinner", effort: 3, frequency: "daily" },
  { id: "trash", name: "taking out the trash", effort: 1, frequency: "weekly" },
  { id: "laundry", name: "laundry", effort: 3, frequency: "weekly" },
  { id: "vacuum", name: "vacuuming", effort: 2, frequency: "weekly" },
  { id: "groceries", name: "grocery run", effort: 3, frequency: "weekly" },
].map((c) => Chore.parse(c));

const i = (name: string, quantity?: string, allergens: string[] = []) => ({ name, quantity, allergens });
const s = (text: string, timerSec?: number) => ({ text, timerSec });

const recipes: Recipe[] = [
  {
    id: "chana-masala", title: "Chana masala", diets: ["vegetarian", "vegan"], minutes: 35,
    ingredients: [i("chickpeas", "2 cans"), i("onions", "1"), i("canned tomatoes", "1 can"), i("garlic", "3 cloves"), i("ginger", "1 inch"), i("garam masala", "2 tsp"), i("basmati rice", "1.5 cups")],
    steps: [s("Rinse the rice and start it cooking.", 900), s("Dice the onion and fry it in oil until golden.", 480), s("Add garlic, ginger and garam masala; stir for one minute.", 60), s("Add tomatoes and chickpeas, then simmer.", 900), s("Serve over the rice.")],
  },
  {
    id: "dal-tadka", title: "Dal tadka", diets: ["vegetarian"], minutes: 40,
    ingredients: [i("red lentils", "1 cup"), i("onions", "1"), i("garlic", "2 cloves"), i("cumin", "1 tsp"), i("butter", "2 tbsp", ["milk"]), i("basmati rice", "1.5 cups")],
    steps: [s("Rinse lentils and simmer them in 3 cups of water.", 1200), s("Start the rice.", 900), s("Fry cumin, onion and garlic in butter.", 300), s("Pour the tadka over the dal and stir.")],
  },
  {
    id: "spinach-pasta", title: "Garlic spinach pasta", diets: ["vegetarian"], minutes: 20,
    ingredients: [i("pasta", "400 g", ["wheat", "gluten"]), i("spinach", "2 handfuls"), i("garlic", "3 cloves"), i("olive oil", "3 tbsp"), i("cheddar", "1 cup grated", ["milk"])],
    steps: [s("Boil the pasta.", 600), s("Warm olive oil and garlic gently.", 120), s("Wilt the spinach in the garlic oil.", 120), s("Toss with pasta and cheese.")],
  },
  {
    id: "veggie-quesadillas", title: "Veggie quesadillas", diets: ["vegetarian"], minutes: 20,
    ingredients: [i("flour tortillas", "6", ["wheat", "gluten"]), i("cheddar", "2 cups", ["milk"]), i("frozen peas", "1 cup"), i("spinach", "1 handful"), i("onions", "half")],
    steps: [s("Sauté onion, peas and spinach.", 300), s("Fill tortillas with veg and cheese.", undefined), s("Toast each quesadilla until golden.", 180), s("Cut into wedges.")],
  },
  {
    id: "egg-fried-rice", title: "Egg fried rice", diets: ["vegetarian"], minutes: 20,
    ingredients: [i("basmati rice", "3 cups cooked"), i("eggs", "3", ["egg"]), i("frozen peas", "1 cup"), i("soy sauce", "2 tbsp", ["soy", "wheat"]), i("garlic", "2 cloves")],
    steps: [s("Scramble the eggs and set aside.", 120), s("Fry garlic and peas.", 180), s("Add rice and soy sauce; fry until hot.", 240), s("Fold the eggs back in.")],
  },
  {
    id: "aloo-gobi", title: "Aloo gobi", diets: ["vegetarian", "vegan"], minutes: 35,
    ingredients: [i("potatoes", "3"), i("cauliflower", "1 head"), i("onions", "1"), i("cumin", "1 tsp"), i("garam masala", "1 tsp")],
    steps: [s("Cube potatoes and cauliflower.", undefined), s("Fry cumin and onion.", 240), s("Add vegetables and spices, cover and cook.", 1200), s("Uncover and crisp for a few minutes.", 300)],
  },
  {
    id: "chicken-tikka", title: "Sheet-pan chicken tikka", diets: ["halal"], minutes: 40,
    ingredients: [i("chicken thighs", "1 kg"), i("yogurt", "1 cup", ["milk"]), i("garam masala", "2 tsp"), i("garlic", "3 cloves"), i("onions", "2")],
    steps: [s("Marinate chicken in yogurt, garlic and spices.", 600), s("Spread chicken and onions on a sheet pan.", undefined), s("Roast at 220°C / 425°F.", 1500), s("Rest, then serve.", 180)],
  },
  {
    id: "salmon-rice", title: "Soy-glazed salmon with rice", diets: ["pescatarian"], minutes: 30,
    ingredients: [i("salmon fillets", "4", ["fish"]), i("soy sauce", "3 tbsp", ["soy", "wheat"]), i("ginger", "1 inch"), i("basmati rice", "1.5 cups")],
    steps: [s("Start the rice.", 900), s("Mix soy sauce and grated ginger.", undefined), s("Bake salmon brushed with glaze.", 720), s("Serve over rice.")],
  },
  {
    id: "lentil-soup", title: "Red lentil soup", diets: ["vegetarian", "vegan"], minutes: 30,
    ingredients: [i("red lentils", "1 cup"), i("onions", "1"), i("canned tomatoes", "1 can"), i("cumin", "1 tsp"), i("garlic", "2 cloves")],
    steps: [s("Soften onion and garlic.", 300), s("Add lentils, tomatoes, cumin and 4 cups water.", undefined), s("Simmer until the lentils fall apart.", 1200), s("Blend half and stir back in.")],
  },
  {
    id: "potato-frittata", title: "Potato and spinach frittata", diets: ["vegetarian"], minutes: 30,
    ingredients: [i("eggs", "8", ["egg"]), i("potatoes", "2"), i("spinach", "1 handful"), i("cheddar", "half cup", ["milk"])],
    steps: [s("Slice and fry potatoes until tender.", 600), s("Add spinach to wilt.", 60), s("Pour in beaten eggs and cheese.", undefined), s("Cook on low, then finish under the grill.", 480)],
  },
  {
    id: "chickpea-wraps", title: "Crispy chickpea wraps", diets: ["vegetarian", "vegan"], minutes: 25,
    ingredients: [i("chickpeas", "1 can"), i("flour tortillas", "4", ["wheat", "gluten"]), i("spinach", "1 handful"), i("cumin", "1 tsp"), i("olive oil", "2 tbsp")],
    steps: [s("Pat chickpeas dry and toss with oil and cumin.", undefined), s("Roast until crispy.", 1200), s("Warm the tortillas.", 60), s("Fill with spinach and chickpeas.")],
  },
  {
    // Deliberately contains peanuts: the allergen verifier must block it for the Patels (Maya).
    id: "peanut-noodles", title: "Peanut satay noodles", diets: ["vegetarian"], minutes: 20,
    ingredients: [i("noodles", "300 g", ["wheat", "gluten"]), i("peanut butter", "4 tbsp", ["peanut"]), i("soy sauce", "2 tbsp", ["soy", "wheat"]), i("garlic", "1 clove")],
    steps: [s("Cook noodles.", 300), s("Whisk peanut butter, soy and garlic with hot water.", undefined), s("Toss noodles in the sauce.")],
  },
].map((r) => Recipe.parse(r));

export const seedHousehold = {
  id: household.id,
  docs: [
    { kind: "PROFILE" as DocKind, doc: household },
    { kind: "PANTRY" as DocKind, doc: pantry },
    { kind: "CHORES" as DocKind, doc: chores },
    ...recipes.map((r) => ({ kind: `RECIPE#${r.id}` as DocKind, doc: r })),
  ],
  counts: { members: household.members.length, pantry: pantry.length, chores: chores.length, recipes: recipes.length },
};
