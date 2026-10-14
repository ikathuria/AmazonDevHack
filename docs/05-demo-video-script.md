# 05 — Demo video script (target 2:45, hard cap < 3:00)

**Rules that shape this** ([rules](https://amazonappdev2026.devpost.com/rules)):
- under 3 minutes (judges may stop at 3:00);
- show the project working **on the device** (Fire TV or the Vega simulator), and the Alexa+ path (real add-on or the simulated experience);
- public on YouTube/Vimeo;
- **no copyrighted music or third-party trademarks** without permission. Don't show other brands' logos, and use silence or a royalty-free track.

Judging may be AI-assisted and may see only a transcript, so **say every claim out loud**. The **[bracketed]** parts are what's on screen.

**Which Alexa path to film:** if the real add-on is deployed by Oct 19, use an Echo or the Alexa app for the voice shots, and keep `/sim` for one "how it works" beat. Otherwise use `/sim` throughout and say clearly that it's a simulated Alexa+ experience; the rules allow it. Never imply the real add-on is certified or live if it isn't.

| Time | On screen | Narration (speak these words; adjust names only) |
|---|---|---|
| 0:00–0:12 | [Kitchen. TV on the wall showing the Homebase board. Hands chopping onions.] | "Dinner in a busy house is a negotiation: who's allergic to what, whose turn it is, what's in the pantry, and a greasy phone propped up for the recipe. Homebase is an Alexa+ add-on that remembers your household and turns your Fire TV into the kitchen board." |
| 0:12–0:40 | [Speak: "Alexa, ask Homebase to plan dinners this week, something quick on Wednesday." TV: "Drafting… checking everyone's allergies", then 7 dinners appear. Zoom on "⛔ Skipped Peanut satay noodles · Maya is allergic".] | "It plans the week with Claude on Amazon Bedrock, but the model only proposes. A deterministic allergen check decides. It caught peanut satay noodles because Maya is allergic, and it knows Tuesdays are vegetarian here." |
| 0:40–0:52 | [Speak: "Make Friday peanut noodles." Alexa refuses with the reason.] | "Even if I ask for it directly, it refuses and tells me why. That check is code with tests, including disguised names like groundnut oil, satay and ghee. It isn't the model's opinion." |
| 0:52–1:10 | [Speak: "Split the chores fairly." Chores panel fills. Then: "Who's on dishes tonight?" → "Arjun is on dishes today."] | "Chores are split by effort and by who did more last week, and our daughter only gets small jobs. Homebase remembers that across sessions, so on Thursday it still knows." |
| 1:10–1:50 | [Floury hands. "Let's cook tonight's dinner." TV jumps to Now cooking, step 1. "Next step." "Start the timer." Big countdown. **Remote untouched**, then one quick D-pad press of Next ▶ to show it works too.] | "Then we cook. Each step goes to the TV and timers start by voice, so there's zero remote presses while my hands are covered. The remote's D-pad does the same thing if you'd rather press." |
| 1:50–2:05 | ["What do we need to buy?" Shopping panel updates.] | "The shopping list is this week's plan minus what's already in the pantry." |
| 2:05–2:30 | [Architecture diagram from README: Alexa+ → MCP on Lambda → DynamoDB → event stream → Fire TV; SQS → Bedrock worker.] | "Under the hood: a self-hosted MCP server on spec 2025-11-25 over Streamable HTTP, on AWS Lambda with DynamoDB. Alexa+ needs answers in under 500 milliseconds, so the tools never call a model; meal planning runs in a background worker on Bedrock. The TV follows a live event stream." |
| 2:30–2:45 | [Text cards: "200 live calls · p95 101 ms" · "37/40 requests → right tool" · "70+ tests".] | "We measured it: 200 live calls at a p95 of 101 milliseconds, against Alexa's 500. 37 of 40 household requests picked the right tool; the misses were bare 'next' commands with no context. Next up: account linking and certification. Homebase: your family's memory, on the screen you already have." |

## Shot list (record by Mon Oct 19; rough cut Tue Oct 20)

1. **TV board wide shot** (real Fire TV; or Vega Virtual Device screen capture if the device can't run Vega). 5 s of b-roll.
2. **Plan + allergen block:** screen capture of `/sim` or the Alexa app, plus the TV filming the board update. Hold the ⛔ line for 2 s.
3. **set_dinner refusal:** audio of the reply is enough.
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
