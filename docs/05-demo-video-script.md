# 05 — Demo video script (target 2:45, hard cap < 3:00)

**Look:** everything on screen follows [`docs/BRAND.md`](BRAND.md) ("Dinner Departures"). Spoken lines follow its voice rules: warm, name the person and the reason, never "error".

**Rules that shape this** ([rules](https://amazonappdev2026.devpost.com/rules)):
- under 3 minutes (judges may stop at 3:00);
- show the project working **on the device** (Fire TV or the Vega simulator), and the Alexa+ path (real add-on or the simulated experience);
- public on YouTube/Vimeo;
- **no copyrighted music or third-party trademarks** without permission. Don't show other brands' logos, and use silence or a royalty-free track.

Judging may be AI-assisted and may see only a transcript, so **say every claim out loud**. The **[bracketed]** parts are what's on screen.

**Which Alexa path to film (updated 2026-10-14):** the Alexa+ MCP Preview is waitlisted, so:
- Film the voice shots on the **real Echo or Fire TV using the classic skill**: "Alexa, ask home base to …". It calls the same tools.
- Show **`/sim` once** in the "how it works" beat, captioned "Alexa+ (simulated: MCP Preview waitlisted) → our MCP server".
- Say it accurately in narration: "on Alexa today through a skill; built as an Alexa+ MCP add-on." Never imply the Alexa+ add-on is live.
- Phrase the lines with the invocation name: "Alexa, ask home base to plan dinners this week". Inside a cooking session, "next step" and "start the timer" work alone.

| Time | On screen | Narration (speak these words; adjust names only) |
|---|---|---|
| 0:00–0:12 | [Kitchen. TV on the wall showing the Homebase board. Hands chopping onions.] | "Dinner in a busy house is a negotiation: who's allergic to what, whose turn it is, what's in the pantry, and a greasy phone propped up for the recipe. Homebase is built as an Alexa+ add-on. It remembers your household and turns your Fire TV into the kitchen board." |
| 0:12–0:35 | [Speak: "Alexa, ask Homebase to plan dinners this week, something quick on Wednesday." TV: `PLANNING…`, then the dinners **flap in** on the departure board; tonight's row lit amber.] | "It plans the week with Claude on Amazon Bedrock, but the model only proposes. A deterministic allergen check decides, and it knows Tuesdays are vegetarian here." |
| 0:35–0:52 | [**The cancel moment.** Speak: "Make Friday peanut noodles." TV: the row flips to `CANCELLED · ALLERGY` in red, the red ticker scrolls "PEANUT SATAY NOODLES CANCELLED · MAYA HAS AN ALLERGY → REROUTED TO GARLIC SPINACH PASTA", and the safe row flaps in. Alexa: "Not the peanut satay noodles. Maya's allergic to peanuts, so I swapped in garlic spinach pasta for Friday."] | "Even if I ask for it directly, Homebase won't serve it. It cancels it, says why and reroutes to something safe. That check is code with tests, including disguised names like groundnut oil, satay and ghee. It isn't the model's opinion." |
| 0:52–1:10 | [Speak: "Split the chores fairly." Then: "Who's on dishes tonight?" → "Priya is on dishes today." TV hero callout: `DISHES · GATE SINK / PRIYA` in big amber.] | "Chores are split by effort and by who did more last week, and our daughter only gets small jobs. Homebase remembers that across sessions, so on Thursday it still knows." |
| 1:10–1:50 | [Floury hands. "Let's cook tonight's dinner." Tonight's row flips to `NOW COOKING · STEP 1/5`; the step text appears lower left. "Next step." "Start the timer." Amber countdown. **Remote untouched**, then one quick D-pad press of NEXT ▶ to show it works too.] | "Then we cook. Each step goes to the TV and timers start by voice, so there's zero remote presses while my hands are covered. The remote's D-pad does the same thing if you'd rather press." |
| 1:50–2:05 | ["What do we need to buy?" The `SHOPPING ·` line under the hero updates.] | "The shopping list is this week's plan minus what's already in the pantry." |
| 2:05–2:30 | [Architecture diagram from README: Alexa+ → MCP on Lambda → DynamoDB → event stream → Fire TV; SQS → Bedrock worker.] | "Under the hood: a self-hosted MCP server on spec 2025-11-25 over Streamable HTTP, on AWS Lambda with DynamoDB. Alexa+ needs answers in under 500 milliseconds, so the tools never call a model; meal planning runs in a background worker on Bedrock. The TV follows a live event stream." |
| 2:30–2:45 | [Text cards: "200 live calls · p95 105 ms" · "37/40 requests → right tool" · "87 tests".] | "We measured it: 200 live calls at a p95 of 105 milliseconds, against Alexa's 500. 37 of 40 household requests picked the right tool; the misses were bare 'next' commands with no context. Next up: account linking and certification. Homebase: your family's memory, on the screen you already have." |

## Shot list (record by Mon Oct 19; rough cut Tue Oct 20)

1. **TV board wide shot** (real Fire TV; or Vega Virtual Device screen capture if the device can't run Vega). 5 s of b-roll.
2. **Plan:** screen capture of `/sim` or the Alexa app, plus the TV filming the dinners flapping in.
3. **The cancel moment (hero shot):** "make Friday peanut noodles". Film the TV close enough to read `CANCELLED · ALLERGY` and the red ticker, and hold 2 s. Do two takes.
4. **Chores + "who's on dishes".**
5. **Cook-along:** a real pan, flour on hands, voice "next step" ×2 + timer; one D-pad press.
6. **Shopping list.**
7. **Architecture diagram:** use the README diagram, or redraw it cleanly (no AWS/Amazon logos unless allowed).
8. **Numbers cards:** pull from `eval/latency.md` and `eval/RESULTS.md` on the day. **Re-check the numbers before recording**; if they change, change the script.

## Before recording

- Reset the demo household: `TABLE_NAME=<TableName> npm run seed` (resets profile/pantry/chores/recipes; plan and chores regenerate during the take).
- Hit `<ServerUrl>/health` once (it's kept warm, but be sure).
- If you use `/sim`, use Chrome (voice input), turn system volume up, and do one practice take.
- The narrator's voice is ours, recorded over the cut. Captions are optional but help.
