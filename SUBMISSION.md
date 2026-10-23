# Devpost submission (paste-ready)

> **Internal, do not paste.** Deadline: Fri 2026-10-23 12:00 PT (14:00 CT). Everything below the line is final text. Still open, in order:
> 1. Paste the public video link into the `Video` line (the only placeholder left).
> 2. Read the opinion lines once: "What we learned" and each "Build again?" answer. They're written from what the friction log and code show; change any that isn't how you feel.
> 3. Add the setup time to the Vega "Onboarding" line.
> 4. Attach a Vega Virtual Device screenshot (`docs/media/` has web-board shots only).
> 5. Tick the Alexa+ and Fire TV tracks and the AWS Builder mini-challenge on the form.

---

## Basics
- **Project name:** Homebase
- **Tagline (≤ 200 chars):** Built as an Alexa+ MCP add-on: remembers your household's allergies, chores and pantry, plans safe dinners, and turns the family TV into a hands-free kitchen board.
- **Primary track(s):** Alexa+ (primary) and Fire TV. The Fire TV app runs on the Vega Virtual Device. The Alexa+ path is a live MCP server plus the simulated Alexa+ experience, because MCP Preview access is waitlisted (see "What is real and what is simulated").
- **Mini challenge:** AWS Builder (Lambda with response streaming, DynamoDB, SQS, EventBridge, Amazon Bedrock, CDK).
- **Repo:** https://github.com/ikathuria/AmazonDevHack (public, MIT license visible in About)
- **Video:** TODO_VIDEO_LINK (public YouTube/Vimeo, under 3:00)
- **Try it (no login, demo household "The Patels"):** base URL `https://koothznswwvs4koyux64x4bs3e0msbsb.lambda-url.us-east-1.on.aws` · `/sim` simulated Alexa+ with the live board · `/board` the Dinner Departures board · `/mcp` the MCP endpoint.

## What is real and what is simulated
| Piece | State | Evidence |
|---|---|---|
| MCP server, 22 tools (spec 2025-11-25, Streamable HTTP) | Live on AWS | `/mcp`; `eval/latency.md` (200 calls, p50 71 ms, p95 105 ms) |
| Alexa+ add-on on a real Alexa+ account | **Not deployed.** Alexa+ CLI/MCP Preview access is waitlisted | `FRICTION_LOG.md` (2026-10-09, 2026-10-14); package drafted in `addon/addon-package/addon.json` |
| Alexa+ experience | **Simulated** by `/sim`: a Bedrock agent calling the same tools | `apps/server/src/lib/agent.ts` |
| Real Echo / Fire TV voice | Classic skill "home base", dev stage on our account | `skill/README.md` |
| Fire TV app | React Native for Vega, runs on the **Vega Virtual Device**. Our physical Fire TV (Fire OS 8.1.8.0) can't install Vega apps | `apps/tv/README.md`; `FRICTION_LOG.md` (2026-10-19) |
| Web board `/board` | Same board in a browser (backstop, not the Fire TV app) | `apps/server/src/board-page.ts` |
| Auth / account linking | Not built; every call acts on the demo household | README, Limitations |
| Meal-planning LLM | Claude Haiku 4.5 on Bedrock proposes; deterministic code verifies and can replace any pick | `features/meals/planner.ts`, `allergen-verifier.ts` |

## Verify it yourself (about two minutes)
```bash
U=https://koothznswwvs4koyux64x4bs3e0msbsb.lambda-url.us-east-1.on.aws
curl -s $U/health                                   # {"ok":true,"service":"homebase"}
curl -s $U/api/tools | python3 -c "import json,sys;print(len(json.load(sys.stdin)),'tools')"   # 22
curl -s -XPOST $U/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}'
curl -s -XPOST $U/api/tools/whos_on -H 'content-type: application/json' -d '{"chore":"dishes","day":"today"}'
```
Open `$U/board` next to `$U/sim`, type "make Friday peanut noodles", and the row flips to `CANCELLED · ALLERGY`. Locally: `npm ci && npm run install:all && npm test` (87 tests) and `npm run dev`.

## How it maps to the hackathon criteria
- **Tech implementation:** MCP server on Lambda with response streaming; DynamoDB, SQS, EventBridge, CDK, Bedrock; no model in the tool path (p95 105 ms against a 500 ms budget); a claim-to-code table in the README.
- **Design:** one flow across voice, TV and a D-pad fallback; 10-foot UI with brand tokens (`docs/BRAND.md`, `design/tokens.json`); the cancel moment is the central interaction.
- **Potential impact:** households managing allergies, chores and dinner together; limits are stated below (demo household only, no account linking yet, no pilot yet).
- **Quality of idea:** state kept across sessions, an agentic plan-and-verify workflow, and the TV driven by voice.

## Inspiration
Dinner in a busy household is a negotiation, not a recipe search. So we made the family TV a train-station departure board for dinner, where unsafe meals get cancelled on screen: who's allergic to what, whose turn it is to cook, what's already in the pantry, and a greasy phone propped up for the instructions. Alexa+ can already suggest recipes; what it doesn't keep is the household's shared memory. We wanted the family TV, the one screen everyone already looks at, to be the kitchen board, run entirely by voice.

## What it does
- **Remembers the household** across sessions: members, allergies, diets, dislikes, house rules like vegetarian Tuesdays, the pantry and a chore history.
- **Plans the week's dinners.** Claude on Amazon Bedrock proposes; a deterministic allergen and diet check decides. Ask for an unsafe dish directly and the TV board flips it to `CANCELLED · ALLERGY`, a red ticker gives the reason, and a safe dinner takes its place. Alexa says: "Not the peanut satay noodles. Maya's allergic to peanuts, so Friday stays chana masala."
- **Splits chores fairly** by effort and history, gives children only small jobs, and answers "who's on dishes tonight?"
- **Cooks along hands-free:** step-by-step on the TV, voice "next step" and timers, with the D-pad as a fallback.
- **Builds the shopping list** from the plan minus the pantry.
- **Export or delete** all household data on request.

## How we built it
- **Alexa+ MCP add-on (designed for it, not deployed to Alexa+):** a self-hosted MCP server (spec 2025-11-25, Streamable HTTP) built with the official TypeScript SDK and Hono, exposing 22 tools. One tool registry serves MCP (Alexa+), REST (the TV's D-pad) and our simulated Alexa+ agent.
- **Latency first:** Alexa+ certification needs < 500 ms round trips, so MCP tools never call a model. They read and write DynamoDB and return in ~70 ms. Meal planning is queued on SQS and run by a worker Lambda calling Bedrock. Measured: 200 live calls, p95 105 ms.
- **The TV:** Alexa+ add-ons have no Fire TV surface, so the board subscribes to our own Server-Sent Events feed (Lambda response streaming; resumable with Last-Event-ID). The Fire TV app (`apps/tv`, React Native for Vega, Vega SDK 0.24) follows the same feed. Vega has no `EventSource`, so it reads the SSE stream through `XMLHttpRequest`, which Vega delivers incrementally, reconnecting with the last event number and dropping duplicates. The D-pad calls the same tool registry as Alexa, "today" is computed in the household's timezone, and the brand fonts are bundled so the TV works offline. It runs on the Vega Virtual Device: our physical Fire TV runs Fire OS, which can't install Vega apps.
- **Safety in code, not prompts:** the allergen verifier matches declared tags *and* ingredient names, including disguised names (groundnut, satay, arachis, ghee, tahini, marzipan…), with 30 test cases. The chore rotation is deterministic and tested for fairness over 8 weeks.
- **AWS:** CDK stack with Lambda (arm64, Node 24), Function URL with response streaming, DynamoDB single table with TTL, SQS + DLQ, EventBridge warm-up, and Bedrock (Claude Haiku 4.5).
- **Built with Claude Code** by a two-person team. Humans set the scope and safety rules; Claude Code wrote most of the code and tests (disclosed in the README). The 40-request eval set was also written by Claude Code.

## Challenges
- **Alexa AI CLI access:** the CLI installs from a private registry behind an AWS role our account couldn't assume (AccessDenied on `AddOn3PDeveloperToolsRead`). Support told us MCP Preview access is phased and waitlisted us, so we built the rules' simulated Alexa+ path on the same tools.
- **Bedrock access:** a use-case form, then a Marketplace payment check, each surfaced as a different error from Lambda than from the CLI. The deterministic planner kept the product working throughout.
- **Real-time TV updates from serverless:** Lambda instances share no memory, so the event stream polls DynamoDB once a second, with a per-household sequence counter so a reconnecting TV resumes after the last event it applied.

## Accomplishments
- 22 tools, p95 105 ms over 200 live calls, against a 500 ms budget.
- 37/40 casual household requests routed to the right tool and arguments by an LLM client (agent-written eval set, so read it as optimistic).
- An allergy check implemented in code rather than a prompt, with 87 server and contract tests (a separate suite covers the TV app) (plus a separate suite for the TV app).
- A Fire TV app on Vega that follows a live feed, reconnects without duplicating events, and handles the cancel + reroute moment (cancelled and rerouted rows always stay inside the 5-row board).

## What we learned
A tool's description matters as much as its code when the caller is an LLM. Keeping models out of the request path is what made the 500 ms budget easy: the model proposes slowly in a worker and plain code decides. An eval written by the same agent that wrote the tool descriptions is only a smoke test, so we say so. On the TV side, the Vega docs for RN 0.83 lagged what actually works (fonts, streaming over XHR), so we probed the Virtual Device instead of trusting the pages.

## What's next
Alexa+ account linking (OAuth 2.1 + PKCE via Cognito) so any household can sign up; certification; a Fire TV Appstore release; a pilot with 5–10 households before thinking about pricing.

## Built with
TypeScript · Alexa+ MCP add-on (MCP 2025-11-25) · Alexa Skills Kit (ASK CLI, ASK SDK for Node.js) · @modelcontextprotocol/sdk · Hono · AWS Lambda · DynamoDB · SQS · EventBridge · Amazon Bedrock (Claude) · AWS CDK · Vitest · React Native for Vega (Vega SDK 0.24)

---

## Product Feedback (required, one block per tool)

Written from what we actually hit; details and dates are in `FRICTION_LOG.md`.

**Alexa+ MCP Toolkit / Alexa AI CLI**
- *Used for:* the Homebase add-on package (`addon/addon-package/addon.json`), target endpoint `/mcp`.
- *Worked well:* the requirements are concrete (spec version, Streamable HTTP, latency budget, the auth checklist), which let us design for them up front.
- *Needs work:* the CLI is only on a private CodeArtifact registry behind a role our account couldn't assume, with no self-serve way to register an account. No page says whether dev-stage add-ons need OAuth, or how a tool becomes "user-specific" (Tier 2). There's no Fire TV rendering surface for MCP Apps.
- *Onboarding:* blocked at install. Support replied that MCP Preview access is rolled out to partners in phases, and we were waitlisted with no date, so we built the rules' simulated Alexa+ path on our live MCP server.
- *Build again?* yes, if self-serve access exists. The requirements are clear and testable; the blocker was access, not the platform.

**Fire TV / Vega SDK**
- *Used for:* the Fire TV kitchen board (`apps/tv`): React Native 0.83 on Vega SDK 0.24, Vega CLI 1.4.5, the Virtual Device, Jest with the Vega preset.
- *Worked well:* the Virtual Device ran our app with real D-pad input, and the build/run loop was short once the toolchain was installed. Bundled fonts worked once files were named after each weight's family.
- *Needs work:* nothing tells you which Fire TV devices can run Vega apps, and our Fire TV (Fire OS 8.1.8.0) can't, so we built and recorded on the Virtual Device. The RN 0.83 docs don't cover custom fonts or streaming (`EventSource` doesn't exist; incremental `XMLHttpRequest` works). There's no simple sound-effect API (we dropped the timer chime). The Virtual Device runs on UTC, not the host timezone. `vega device run-cmd` is flaky and there's no `vega device screenshot`. The Jest preset's `Dimensions.addEventListener` mock returns `undefined`, which breaks unmount. All logged with dates in `FRICTION_LOG.md`.
- *Onboarding:* TODO_SETUP_TIME (install, first Virtual Device run, number of attempts).
- *Build again?* yes, once a Vega-capable device and the docs for current RN versions are easier to find.

**Alexa Skills Kit (ASK CLI + ASK SDK for Node.js)**
- *Used for:* the "home base" classic skill, the on-device voice front end on a real Echo/Fire TV (an interaction model generated from our data; intents run our tools in-process).
- *Worked well:* `ask configure` and the SMAPI commands (`create-skill-for-vendor`, `set-interaction-model`, `simulate-skill`) made a scriptable, testable loop; entity resolution handled synonyms ("dairy" → milk).
- *Needs work:* `SkillBuilders...lambda()` returns a callback handler that Node 24 Lambdas reject (`Runtime.CallbackHandlerDeprecated`), while Alexa only reports "There was a problem with the requested skill's response". Possessive samples like `{member}'s` fail the model build. `ask dialog --replay` stays interactive, so it can't be scripted.
- *Build again?* yes for the skill route today. It works on real Echo and Fire TV hardware, whereas Alexa+ add-ons are still gated.

**Amazon Bedrock**
- *Used for:* weekly meal planning (worker) and the simulated Alexa+ agent (Converse API with tool use), Claude Haiku 4.5.
- *Worked well:* the Converse tool-use API mapped cleanly onto our tool registry; latency and cost (~$0.01 per plan) were fine.
- *Needs work:* access errors arrived one at a time (use-case form, then INVALID_PAYMENT_INSTRUMENT for the Marketplace subscription), and the CLI and Lambda disagreed about access for the same account and model. Haiku 5.5 was listed in the catalog but "not available for this account".
- *Build again?* Yes. the Converse tool-use API mapped straight onto our tool registry, and a plan costs about a cent.

**AWS Lambda (response streaming) / DynamoDB / SQS / EventBridge / CDK**
- *Used for:* the MCP server + SSE feed, the single-table store with TTL, the planning queue with a DLQ, warm-up pings, infrastructure as code.
- *Worked well:* response streaming made SSE possible with no extra service; the CDK deploy took ~100 s.
- *Needs work:* `NodejsFunction` requires the entry under `projectRoot` (we had to set it for a monorepo); `logRetention` is deprecated in favor of `logGroup`; streaming handlers are hard to wrap (we shaped the EventBridge warm-up as a Function URL event instead).
- *Build again?* yes. Response streaming gave us SSE with no extra service, and CDK deploys in about 100 s.

## Media to upload (all in `docs/media/`)
- **Image gallery:** `01-week-plan.png`, `02-cancel-allergy.png`, `03-chores-dishes.png`, `04-cook-along-timer.png`, `05-architecture.png` (1920×1080). These are the web board, not the Vega Virtual Device: add a Virtual Device screenshot for the Fire TV track.
- **Project thumbnail:** `thumbnail-1500x1000.png` (3:2).
- **Video:** `homebase-board-visuals.mp4` is a silent 2:45 b-roll of the board. Add your voiceover and device footage over it, and end with `end-card-5s.mp4`.

## Optional fields
- **Feature requests:** (1) Self-serve CLI access for hackathon accounts. Critical. (2) A Fire TV surface for MCP Apps, or a way for an add-on to target a paired Fire TV app. Important. (3) Documented minimum auth for dev-stage add-ons. Important. (4) A list of Vega-capable Fire TV devices, and a lightweight sound-effect API for Vega. Nice to have.
- **Friction log:** `FRICTION_LOG.md` in the repo (14 dated entries, each with steps, expected vs actual, severity, workaround and suggestion).
