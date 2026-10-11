// Every Homebase tool, in the order Alexa+ sees them.
import type { ToolDef } from "../lib/tools.js";
import { householdTools } from "./household/tools.js";
import { dataTools } from "./household/data-tools.js";
import { pantryTools } from "./pantry/tools.js";
import { mealTools } from "./meals/tools.js";
import { choreTools } from "./chores/tools.js";
import { cookTools } from "./cook/tools.js";
import { shoppingTools } from "./shopping/tools.js";

export const allTools: ToolDef[] = [...householdTools, ...mealTools, ...choreTools, ...cookTools, ...shoppingTools, ...pantryTools, ...dataTools];
