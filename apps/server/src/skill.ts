// Classic Alexa skill ("home base"): an on-device voice front end for the same Homebase tools.
// Why it exists: Alexa+ MCP Preview access is waitlisted (FRICTION_LOG 2026-10-14), so this is how a real Echo / Fire TV
// drives the board in the demo. The Alexa+ entry itself is the MCP server (/mcp) and the simulated Alexa+ (/sim).
// Each intent maps to one registry tool; the tool runs in-process (no HTTP hop), so replies stay well under Alexa's timeout.
import * as Alexa from "ask-sdk-core";
import type { HandlerInput, RequestHandler, ErrorHandler } from "ask-sdk-core";
import type { IntentRequest, Response, Slot } from "ask-sdk-model";
import { allTools } from "./features/index.js";
import { runTool, type ToolContext } from "./lib/tools.js";

// Slot value → canonical id via entity resolution (synonyms like "dairy" → milk), falling back to what was heard.
export function resolved(slot: Slot | undefined): string | undefined {
  if (!slot?.value) return undefined;
  const auth = slot.resolutions?.resolutionsPerAuthority?.find((r) => r.status?.code === "ER_SUCCESS_MATCH");
  return auth?.values?.[0]?.value?.id ?? slot.value;
}

type Mapping = {
  tool: string;
  args?: (slots: Record<string, Slot>) => Record<string, unknown>;
  heard: (slots: Record<string, Slot>) => string; // shown on the board as "Heard: …"
  keepOpen?: boolean; // cooking turns keep the mic open so "next" works without re-invoking
};

const v = (s: Record<string, Slot>, name: string) => resolved(s[name]);
const opt = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined && x !== ""));

export const INTENTS: Record<string, Mapping> = {
  PlanWeekIntent: { tool: "plan_week", heard: () => "plan dinners this week" },
  PlanWeekWithRequestIntent: { tool: "plan_week", args: (s) => opt({ request: s.request?.value }), heard: (s) => `plan dinners this week, ${s.request?.value ?? ""}` },
  GetPlanIntent: { tool: "get_plan", args: (s) => opt({ day: v(s, "day") }), heard: (s) => `what's for dinner ${s.day?.value ?? "tonight"}` },
  GetWeekIntent: { tool: "get_plan", args: () => ({ day: "week" }), heard: () => "read me the week" },
  SetDinnerIntent: { tool: "set_dinner", args: (s) => opt({ day: v(s, "day") ?? "today", recipe: s.recipe?.value }), heard: (s) => `make ${s.day?.value ?? "tonight"} ${s.recipe?.value ?? ""}` },
  AssignChoresIntent: { tool: "assign_chores", heard: () => "split the chores" },
  WhosOnIntent: { tool: "whos_on", args: (s) => opt({ chore: v(s, "chore"), day: v(s, "day") }), heard: (s) => `who's on ${s.chore?.value ?? "chores"} ${s.day?.value ?? ""}` },
  MemberChoresIntent: { tool: "whos_on", args: (s) => opt({ member: s.member?.value, day: v(s, "day") }), heard: (s) => `what does ${s.member?.value ?? "everyone"} have to do` },
  ChoreDoneIntent: { tool: "mark_chore_done", args: (s) => opt({ chore: v(s, "chore") }), heard: (s) => `${s.chore?.value ?? "chore"} is done` },
  ChoreBalanceIntent: { tool: "chore_balance", heard: () => "is the chore split fair" },
  StartCookingIntent: { tool: "start_cooking", args: (s) => opt({ recipe: s.recipe?.value }), heard: (s) => `let's cook ${s.recipe?.value ?? "tonight's dinner"}`, keepOpen: true },
  NextStepIntent: { tool: "next_step", heard: () => "next step", keepOpen: true },
  "AMAZON.NextIntent": { tool: "next_step", heard: () => "next", keepOpen: true },
  "AMAZON.PreviousIntent": { tool: "previous_step", heard: () => "go back", keepOpen: true },
  "AMAZON.RepeatIntent": { tool: "repeat_step", heard: () => "say that again", keepOpen: true },
  StartTimerIntent: { tool: "start_timer", args: (s) => opt({ minutes: s.minutes?.value ? Number(s.minutes.value) : undefined }), heard: (s) => `start the timer${s.minutes?.value ? ` for ${s.minutes.value} minutes` : ""}`, keepOpen: true },
  ShoppingListIntent: { tool: "shopping_list", heard: () => "what do we need to buy" },
  AddToListIntent: { tool: "add_to_list", args: (s) => ({ items: [s.item?.value].filter(Boolean) }), heard: (s) => `add ${s.item?.value ?? ""} to the list` },
  HouseholdIntent: { tool: "get_household", heard: () => "what do you know about us" },
  AddAllergyIntent: { tool: "update_member_preferences", args: (s) => opt({ member: s.member?.value, addAllergies: v(s, "allergen") ? [v(s, "allergen")] : undefined }), heard: (s) => `${s.member?.value ?? ""} is allergic to ${s.allergen?.value ?? ""}` },
};

const REPROMPT = "What next? You can say next step, start the timer, or stop.";
const HELP = "Homebase plans dinners around your family's allergies, splits chores fairly and cooks along on your TV. Try: plan dinners this week, who's on dishes tonight, or let's cook.";

export function createSkillHandlers(ctxFor: () => ToolContext): RequestHandler[] {
  const say = (h: HandlerInput, text: string, keepOpen = false): Response => {
    const rb = h.responseBuilder.speak(text);
    return keepOpen ? rb.reprompt(REPROMPT).getResponse() : rb.withShouldEndSession(true).getResponse();
  };

  const launch: RequestHandler = {
    canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === "LaunchRequest",
    handle: (h) => h.responseBuilder.speak("Homebase here. What do you need: dinners, chores, or cooking?").reprompt(HELP).getResponse(),
  };

  const toolIntent: RequestHandler = {
    canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" && Alexa.getIntentName(h.requestEnvelope) in INTENTS,
    handle: async (h) => {
      const intent = (h.requestEnvelope.request as IntentRequest).intent;
      const map = INTENTS[intent.name];
      const slots = intent.slots ?? {};
      const tool = allTools.find((t) => t.name === map.tool)!;
      const ctx = ctxFor();
      await ctx.store.appendEvent(ctx.householdId, { type: "voice.heard", utterance: map.heard(slots).replace(/\s+/g, " ").trim().slice(0, 200) });
      const r = await runTool(tool, ctx, map.args ? map.args(slots) : {});
      return say(h, r.text, map.keepOpen);
    },
  };

  const help: RequestHandler = {
    canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" && ["AMAZON.HelpIntent", "AMAZON.FallbackIntent"].includes(Alexa.getIntentName(h.requestEnvelope)),
    handle: (h) => h.responseBuilder.speak(Alexa.getIntentName(h.requestEnvelope) === "AMAZON.FallbackIntent" ? `Homebase can't do that one. ${HELP}` : HELP).reprompt(HELP).getResponse(),
  };

  const stop: RequestHandler = {
    canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" && ["AMAZON.StopIntent", "AMAZON.CancelIntent", "AMAZON.NavigateHomeIntent"].includes(Alexa.getIntentName(h.requestEnvelope)),
    handle: (h) => h.responseBuilder.speak("Okay. The board stays on your TV.").withShouldEndSession(true).getResponse(),
  };

  const ended: RequestHandler = {
    canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === "SessionEndedRequest",
    handle: (h) => h.responseBuilder.getResponse(),
  };

  return [launch, toolIntent, help, stop, ended];
}

// Brand voice: say what happened, never "error".
export const skillErrorHandler: ErrorHandler = {
  canHandle: () => true,
  handle: (h, err) => {
    console.error("[skill]", err);
    return h.responseBuilder.speak("I couldn't reach your household's records just now, so nothing changed. Try again in a moment.").withShouldEndSession(true).getResponse();
  },
};
