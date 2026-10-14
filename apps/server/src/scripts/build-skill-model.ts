// Generates the classic skill's interaction model (skill/skill-package/interactionModels/custom/en-US.json)
// from the seed data, so recipe/chore/member slot values never drift from what the tools know.
// Usage: npm --prefix apps/server run skill:model
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seedHousehold } from "./seed-data.js";
import type { Chore, Household, Recipe } from "../lib/contracts.js";

const docOf = <T>(kind: string) => seedHousehold.docs.find((d) => d.kind === kind)!.doc as T;
const household = docOf<Household>("PROFILE");
const chores = docOf<Chore[]>("CHORES");
const recipes = seedHousehold.docs.filter((d) => d.kind.startsWith("RECIPE#")).map((d) => d.doc as Recipe);

const value = (id: string, name: string, synonyms: string[] = []) => ({ id, name: { value: name, synonyms } });
const shortName = (title: string) => title.toLowerCase().replace(/^(sheet-pan|crispy|garlic|soy-glazed|red|veggie)\s+/, "");

export const model = {
  interactionModel: {
    languageModel: {
      invocationName: "home base",
      intents: [
        { name: "AMAZON.CancelIntent", samples: [] }, { name: "AMAZON.HelpIntent", samples: [] }, { name: "AMAZON.StopIntent", samples: [] },
        { name: "AMAZON.NavigateHomeIntent", samples: [] }, { name: "AMAZON.FallbackIntent", samples: [] },
        { name: "AMAZON.NextIntent", samples: [] }, { name: "AMAZON.PreviousIntent", samples: [] }, { name: "AMAZON.RepeatIntent", samples: [] },
        { name: "PlanWeekIntent", samples: ["plan dinners this week", "plan dinners", "plan the week", "make a meal plan", "plan this week's dinners", "sort out dinners this week"] },
        { name: "PlanWeekWithRequestIntent", slots: [{ name: "request", type: "AMAZON.SearchQuery" }], samples: ["plan dinners this week but {request}", "plan dinners and {request}", "plan the week with {request}"] },
        { name: "GetPlanIntent", slots: [{ name: "day", type: "DAY" }], samples: ["what's for dinner", "what's for dinner {day}", "what are we having {day}", "what are we eating {day}", "what's the plan for {day}", "what's for dinner on {day}"] },
        { name: "GetWeekIntent", samples: ["read me the week", "read me the meal plan", "what's the plan this week", "what are we eating this week"] },
        { name: "SetDinnerIntent", slots: [{ name: "day", type: "DAY" }, { name: "recipe", type: "RECIPE" }], samples: ["make {day} {recipe}", "put {recipe} on {day}", "can we have {recipe} {day}", "can we have {recipe} on {day}", "have {recipe} for dinner {day}", "swap {day} to {recipe}", "let's have {recipe} {day}"] },
        { name: "AssignChoresIntent", samples: ["split the chores", "split the chores fairly", "make a chore chart", "redo the rota", "make the chore rota"] },
        { name: "WhosOnIntent", slots: [{ name: "chore", type: "CHORE" }, { name: "day", type: "DAY" }], samples: ["who's on {chore}", "who's on {chore} {day}", "whose turn is it to do the {chore}", "who's doing the {chore} {day}", "who's doing {chore}"] },
        { name: "MemberChoresIntent", slots: [{ name: "member", type: "MEMBER" }, { name: "day", type: "DAY" }], samples: ["what does {member} have to do", "what does {member} have to do {day}", "what are the chores for {member}", "what chores does {member} have {day}"] },
        { name: "ChoreDoneIntent", slots: [{ name: "chore", type: "CHORE" }], samples: ["{chore} is done", "{chore} are done", "{chore} done", "mark {chore} done", "the {chore} is out", "I finished the {chore}"] },
        { name: "ChoreBalanceIntent", samples: ["is the chore split fair", "who's done the most chores", "how fair are the chores"] },
        { name: "StartCookingIntent", slots: [{ name: "recipe", type: "RECIPE" }], samples: ["let's cook", "let's make dinner", "start cooking", "start cooking {recipe}", "walk me through {recipe}", "let's cook {recipe}", "cook tonight's dinner"] },
        { name: "NextStepIntent", samples: ["next step", "what's next", "done what now", "okay next", "go on"] },
        { name: "StartTimerIntent", slots: [{ name: "minutes", type: "AMAZON.NUMBER" }], samples: ["start the timer", "start a timer", "set a timer for {minutes} minutes", "timer for {minutes} minutes", "start the timer for this step"] },
        { name: "ShoppingListIntent", samples: ["what do we need to buy", "make the shopping list", "what's on the shopping list", "what do I need from the store"] },
        { name: "AddToListIntent", slots: [{ name: "item", type: "AMAZON.Food" }], samples: ["add {item} to the list", "add {item} to the shopping list", "we need {item}", "we're out of {item}"] },
        { name: "HouseholdIntent", samples: ["what do you know about us", "who's allergic to what", "what do you know about our family"] },
        { name: "AddAllergyIntent", slots: [{ name: "member", type: "MEMBER" }, { name: "allergen", type: "ALLERGEN" }], samples: ["{member} is allergic to {allergen}", "{member} can't have {allergen}", "{member} can't eat {allergen}"] },
      ],
      types: [
        { name: "DAY", values: [
          value("today", "today", ["tonight", "this evening"]), value("tomorrow", "tomorrow", ["tomorrow night"]),
          value("monday", "monday"), value("tuesday", "tuesday"), value("wednesday", "wednesday"), value("thursday", "thursday"),
          value("friday", "friday"), value("saturday", "saturday"), value("sunday", "sunday"),
        ] },
        { name: "RECIPE", values: recipes.map((r) => value(r.id, r.title.toLowerCase(), [shortName(r.title)].filter((x) => x !== r.title.toLowerCase()))) },
        { name: "CHORE", values: chores.map((c) => value(c.id, c.name, c.id === "dishes" ? ["the dishes", "washing up"] : c.id === "trash" ? ["trash", "the trash", "garbage", "bins"] : c.id === "cook" ? ["cooking", "dinner"] : [])) },
        { name: "MEMBER", values: household.members.map((m) => value(m.id, m.name.toLowerCase())) },
        { name: "ALLERGEN", values: [
          value("peanut", "peanuts", ["peanut", "groundnuts"]), value("tree_nut", "tree nuts", ["nuts", "almonds", "cashews", "walnuts"]),
          value("milk", "dairy", ["milk", "lactose"]), value("egg", "eggs", ["egg"]), value("wheat", "wheat"), value("gluten", "gluten"),
          value("soy", "soy", ["soya"]), value("fish", "fish"), value("shellfish", "shellfish", ["shrimp", "prawns"]), value("sesame", "sesame", ["sesame seeds"]),
        ] },
      ],
    },
  },
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = join(dirname(fileURLToPath(import.meta.url)), "../../../../skill/skill-package/interactionModels/custom/en-US.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(model, null, 2) + "\n");
  console.log(`wrote ${out}: ${model.interactionModel.languageModel.intents.length} intents`);
}
