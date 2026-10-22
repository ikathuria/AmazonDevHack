# Devpost submission draft (copy-paste on Thu Oct 22)

> Updated 2026-10-22. Numbers re-checked against `eval/` and the README. **Before submitting, only these remain:** (1) paste the public video link (the `Video` line); (2) read the **Product Feedback** blocks and the "What we learned" section, which are drafted from the friction log and *must be edited into your own words*, especially every "Build again?" answer (they are opinions, so confirm or change them); (3) confirm the track and mini-challenge boxes on the Devpost form.

## Basics
- **Project name:** Homebase
- **Tagline (≤ 200 chars):** An Alexa+ add-on that remembers your household's allergies, chores and pantry, plans safe dinners, and turns your Fire TV into a hands-free kitchen board.
- **Primary track(s):** Alexa+ (primary) and Fire TV. The Fire TV app runs on the Vega Virtual Device (shown in the video); the Alexa+ path is a live MCP server plus the simulated Alexa+ experience, because MCP Preview access is waitlisted.
- **Mini challenge:** AWS Builder (Lambda with response streaming, DynamoDB, SQS, EventBridge, Amazon Bedrock, CDK).
- **Repo:** https://github.com/ikathuria/AmazonDevHack (public, MIT license visible in About)
- **Video:** TODO paste YouTube/Vimeo link here (public, < 3:00)
- **Try it:** `https://koothznswwvs4koyux64x4bs3e0msbsb.lambda-url.us-east-1.on.aws/sim` (simulated Alexa+ + live board), `/board` ("Dinner Departures" TV board), `/mcp` (MCP endpoint). No login; demo household.

## Inspiration
Dinner in a busy household is a negotiation, not a recipe search. So we made the family TV a train-station departure board for dinner, where unsafe meals get cancelled on screen: who's allergic to what, whose turn it is to cook, what's already in the pantry, and a greasy phone propped up for the instructions. Alexa+ can already suggest recipes; what it doesn't keep is the household's shared memory. We wanted the family TV, the one screen everyone already looks at, to be the kitchen board, run entirely by voice.

## What it does
- **Remembers the household** across sessions: members, allergies, diets, dislikes, house rules like vegetarian Tuesdays, the pantry and a chore history.
- **Plans the week's dinners.** Claude on Amazon Bedrock proposes; a deterministic allergen and diet check decides. Ask for an unsafe dish directly and the TV board flips it to `CANCELLED · ALLERGY`, a red ticker gives the reason, and a safe dinner takes its place. Alexa says: "Not the peanut satay noodles. Maya's allergic to peanuts, so I swapped in garlic spinach pasta for Friday."
- **Splits chores fairly** by effort and history, gives children only small jobs, and answers "who's on dishes tonight?"
- **Cooks along hands-free:** step-by-step on the TV, voice "next step" and timers, with the D-pad as a fallback.
- **Builds the shopping list** from the plan minus the pantry.
- **Export or delete** all household data on request.

## How we built it
- **Alexa+ MCP add-on:** a self-hosted MCP server (spec 2025-11-25, Streamable HTTP) built with the official TypeScript SDK and Hono, exposing 22 tools. One tool registry serves MCP (Alexa+), REST (the TV's D-pad) and our simulated Alexa+ agent.
- **Latency first:** Alexa+ certification needs < 500 ms round trips, so MCP tools never call a model. They read and write DynamoDB and return in ~70 ms. Meal planning is queued on SQS and run by a worker Lambda calling Bedrock. Measured: 200 live calls, p95 101 ms.
- **The TV:** Alexa+ add-ons have no Fire TV surface, so the board subscribes to our own Server-Sent Events feed (Lambda response streaming; resumable with Last-Event-ID). The Fire TV app (`apps/tv`, React Native for Vega, Vega SDK 0.24) follows the same feed. Vega has no `EventSource`, so it reads the SSE stream through `XMLHttpRequest`, which Vega delivers incrementally, reconnecting with the last event number and dropping duplicates. The D-pad calls the same tool registry as Alexa, "today" is computed in the household's timezone, and the brand fonts are bundled so the TV works offline. It runs on the Vega Virtual Device: our physical Fire TV runs Fire OS, which can't install Vega apps.
- **Safety in code, not prompts:** the allergen verifier matches declared tags *and* ingredient names, including disguised names (groundnut, satay, arachis, ghee, tahini, marzipan…), with 30 test cases. The chore rotation is deterministic and tested for fairness over 8 weeks.
- **AWS:** CDK stack with Lambda (arm64, Node 24), Function URL with response streaming, DynamoDB single table with TTL, SQS + DLQ, EventBridge warm-up, and Bedrock (Claude Haiku 4.5).
- **Built with Claude Code** by a two-person team (disclosed in the README).

## Challenges
- **Alexa AI CLI access:** the CLI installs from a private registry behind an AWS role our account couldn't assume (AccessDenied on `AddOn3PDeveloperToolsRead`). Support told us MCP Preview access is phased and waitlisted us, so we built the rules' simulated Alexa+ path on the same tools.
- **Bedrock access:** a use-case form, then a Marketplace payment check, each surfaced as a different error from Lambda than from the CLI. The deterministic planner kept the product working throughout.
- **Real-time TV updates from serverless:** Lambda instances share no memory, so the event stream polls DynamoDB once a second, with a per-household sequence counter for exactly-once resume.

## Accomplishments
- 22 tools, p95 101 ms over 200 live calls, against a 500 ms budget.
- 37/40 casual household requests routed to the right tool and arguments by an LLM client (agent-written eval set, so read it as optimistic).
- An allergy check that can't be talked out of its answer, with 87 server and contract tests in CI (plus a separate suite for the TV app).
- A Fire TV app on Vega that follows a live feed, reconnects without duplicating events, and handles the cancel + reroute moment (cancelled and rerouted rows always stay inside the 5-row board).

## What we learned
TODO edit in your own words. Draft: a tool's description matters as much as its code when the caller is an LLM; keeping models out of the request path is what made a 500 ms budget easy (the model proposes slowly in a worker, plain code decides); and an eval written by the same agent that wrote the tool descriptions is only a smoke test, so we say so. On the TV side, the Vega docs for RN 0.83 lagged what actually works (fonts, streaming over XHR), so we probed the Virtual Device instead of trusting the pages.

## What's next
Alexa+ account linking (OAuth 2.1 + PKCE via Cognito) so any household can sign up; certification; a Fire TV Appstore release; a pilot with 5–10 households before thinking about pricing.

## Built with
TypeScript · Alexa+ MCP add-on (MCP 2025-11-25) · Alexa Skills Kit (ASK CLI, ASK SDK for Node.js) · @modelcontextprotocol/sdk · Hono · AWS Lambda · DynamoDB · SQS · EventBridge · Amazon Bedrock (Claude) · AWS CDK · Vitest · React Native for Vega (Vega SDK 0.24)

---

## Product Feedback (required, one block per tool)

Draft from what we actually hit, with details in `FRICTION_LOG.md`. **Both of us should edit these in our own words.**

**Alexa+ MCP Toolkit / Alexa AI CLI**
- *Used for:* the Homebase add-on package (`addon/addon-package/addon.json`), target endpoint `/mcp`.
- *Worked well:* the requirements are concrete (spec version, Streamable HTTP, latency budget, the auth checklist), which let us design for them up front.
- *Needs work:* the CLI is only on a private CodeArtifact registry behind a role our account couldn't assume, with no self-serve way to register an account. No page says whether dev-stage add-ons need OAuth, or how a tool becomes "user-specific" (Tier 2). There's no Fire TV rendering surface for MCP Apps.
- *Onboarding:* blocked at install. Support replied that MCP Preview access is rolled out to partners in phases, and we were waitlisted with no date, so we built the rules' simulated Alexa+ path on our live MCP server.
- *Build again?* DRAFT, edit: yes, if self-serve access exists. The requirements are clear and testable; the blocker was access, not the platform.

**Fire TV / Vega SDK**
- *Used for:* the Fire TV kitchen board (`apps/tv`): React Native 0.83 on Vega SDK 0.24, Vega CLI 1.4.5, the Virtual Device, Jest with the Vega preset.
- *Worked well:* the Virtual Device ran our app with real D-pad input, and the build/run loop was short once the toolchain was installed. Bundled fonts worked once files were named after each weight's family.
- *Needs work:* nothing tells you which Fire TV devices can run Vega apps, and our Fire TV (Fire OS 8.1.8.0) can't, so we built and recorded on the Virtual Device. The RN 0.83 docs don't cover custom fonts or streaming (`EventSource` doesn't exist; incremental `XMLHttpRequest` works). There's no simple sound-effect API (we dropped the timer chime). The Virtual Device runs on UTC, not the host timezone. `vega device run-cmd` is flaky and there's no `vega device screenshot`. The Jest preset's `Dimensions.addEventListener` mock returns `undefined`, which breaks unmount. All logged with dates in `FRICTION_LOG.md`.
- *Onboarding:* DRAFT, edit: add how long setup took and how many attempts.
- *Build again?* DRAFT, edit: yes, once a Vega-capable device and the docs for current RN versions are easier to find.

**Alexa Skills Kit (ASK CLI + ASK SDK for Node.js)**
- *Used for:* the "home base" classic skill, the on-device voice front end on a real Echo/Fire TV (an interaction model generated from our data; intents run our tools in-process).
- *Worked well:* `ask configure` and the SMAPI commands (`create-skill-for-vendor`, `set-interaction-model`, `simulate-skill`) made a scriptable, testable loop; entity resolution handled synonyms ("dairy" → milk).
- *Needs work:* `SkillBuilders...lambda()` returns a callback handler that Node 24 Lambdas reject (`Runtime.CallbackHandlerDeprecated`), while Alexa only reports "There was a problem with the requested skill's response". Possessive samples like `{member}'s` fail the model build. `ask dialog --replay` stays interactive, so it can't be scripted.
- *Build again?* DRAFT, edit: yes for the skill route today. It works on real Echo and Fire TV hardware, whereas Alexa+ add-ons are still gated.

**Amazon Bedrock**
- *Used for:* weekly meal planning (worker) and the simulated Alexa+ agent (Converse API with tool use), Claude Haiku 4.5.
- *Worked well:* the Converse tool-use API mapped cleanly onto our tool registry; latency and cost (~$0.01 per plan) were fine.
- *Needs work:* access errors arrived one at a time (use-case form, then INVALID_PAYMENT_INSTRUMENT for the Marketplace subscription), and the CLI and Lambda disagreed about access for the same account and model. Haiku 5.5 was listed in the catalog but "not available for this account".
- *Build again?* Yes. DRAFT, edit in your words: the Converse tool-use API mapped straight onto our tool registry, and a plan costs about a cent.

**AWS Lambda (response streaming) / DynamoDB / SQS / EventBridge / CDK**
- *Used for:* the MCP server + SSE feed, the single-table store with TTL, the planning queue with a DLQ, warm-up pings, infrastructure as code.
- *Worked well:* response streaming made SSE possible with no extra service; the CDK deploy took ~100 s.
- *Needs work:* `NodejsFunction` requires the entry under `projectRoot` (we had to set it for a monorepo); `logRetention` is deprecated in favor of `logGroup`; streaming handlers are hard to wrap (we shaped the EventBridge warm-up as a Function URL event instead).
- *Build again?* DRAFT, edit: yes. Response streaming gave us SSE with no extra service, and CDK deploys in about 100 s.

## Optional fields
- **Feature requests:** (1) Self-serve CLI access for hackathon accounts. Critical. (2) A Fire TV surface for MCP Apps, or a way for an add-on to target a paired Fire TV app. Important. (3) Documented minimum auth for dev-stage add-ons. Important. (4) A list of Vega-capable Fire TV devices, and a lightweight sound-effect API for Vega. Nice to have.
- **Friction log:** paste `FRICTION_LOG.md` (it's worth up to +10%).
