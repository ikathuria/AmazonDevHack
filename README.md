# Homebase

**An Alexa+ add-on that remembers your household (allergies, diets, pantry, a fair chore rota) and turns the family TV into a hands-free kitchen board.** Built for Amazon's *Build, Ship, Shape* hackathon (Alexa+ and Fire TV tracks, AWS Builder).

> Status (2026-10-19): the backend and all 22 tools are live on AWS. Measured over 200 live calls: p50 71 ms, p95 101 ms, against Alexa+'s 500 ms budget. 37 of 40 household requests were routed to the right tool. Unsafe dinners are cancelled and rerouted with the reason (30+ allergen test cases). The real Alexa+ deploy is waiting on CLI access, so the simulated Alexa+ path (`/sim`) is the current demo. The Fire TV app (React Native for Vega) runs on the Vega Virtual Device and follows the live feed; `/board` is a web version of the same board. This README only claims what the code does today.

## Try it

| What | Where |
|---|---|
| Simulated Alexa+ + live family board | `<ServerUrl>/sim`. Type or speak; the board on the right mirrors the TV |
| Fire TV app (Vega) | Build `apps/tv` and run it on the Vega Virtual Device ([`apps/tv/README.md`](apps/tv/README.md)), then talk to `/sim` and watch the TV update |
| "Dinner Departures" TV board (web backstop) | `<ServerUrl>/board`. Open it on a TV or laptop next to `/sim`; try "make Friday peanut noodles" to see the cancel + reroute |
| Real Alexa (Echo / Fire TV) | Classic skill "home base" (dev stage on our account; see [`skill/README.md`](skill/README.md)). Say "Alexa, ask home base to plan dinners this week" |
| MCP endpoint (Alexa+ / MCP Inspector) | `<ServerUrl>/mcp` (Streamable HTTP, MCP 2025-11-25, no login; acts on the demo household "The Patels") |
| Live board feed | `<ServerUrl>/households/patels/events` (SSE) and `/households/patels/state` (snapshot) |
| Run the demo journey yourself | `npm --prefix apps/server run journey -- <ServerUrl>` |

`<ServerUrl>` is the `HomebaseStack.ServerUrl` CDK output. The current deployment is `https://koothznswwvs4koyux64x4bs3e0msbsb.lambda-url.us-east-1.on.aws`.

## The problem

Dinner in a busy household is a negotiation: who's allergic to what, whose turn it is to cook or do dishes, what's already in the pantry, and a greasy phone propped up for the recipe. Alexa+ can already suggest recipes. What it doesn't keep is the household's shared memory: allergies, house rules like vegetarian Tuesdays, a fair chore history. Homebase is that memory, exposed as tools Alexa+ can call, with the family TV as the shared screen.

## How it works

```
Alexa+ (or /sim) ──MCP 2025-11-25 / Streamable HTTP──▶ Lambda (Hono + MCP SDK) ──▶ DynamoDB (single table)
                                                        │   └─ appends board events (EVT#seq)
                                                        └─▶ SQS ─▶ worker Lambda ─▶ Bedrock (Claude) ─▶ allergen verifier ─▶ plan
Fire TV (Vega app) / web board ◀── SSE (/households/:id/events, polls DynamoDB 1 s, resumes via Last-Event-ID or ?after=)
```

MCP tools never call an LLM; they read and write DynamoDB and return in about 100 ms. Slow work (meal planning) goes through SQS to a worker. The TV can't be addressed by Alexa+ directly (no Fire TV surface for third-party add-ons), so it subscribes to Homebase's own event feed. React Native for Vega has no `EventSource`, so the TV app reads the same SSE stream through `XMLHttpRequest`, which Vega delivers incrementally.

### Claim → code

| Claim | Where it's implemented | Evidence |
|---|---|---|
| One tool registry serves MCP, REST (TV D-pad) and the simulated Alexa+ agent | `apps/server/src/lib/tools.ts`, `apps/server/src/features/index.ts` | `demo-journey.test.ts` ("serves the same tools over REST") |
| Remembers household preferences across sessions | `features/household/tools.ts` | `demo-journey.test.ts` ("remembers preferences across sessions") |
| Recipes are blocked if they contain a member's allergen, including disguised names (groundnut, satay, ghee, tahini…) | `features/meals/allergen-verifier.ts` | `allergen-verifier.test.ts` (20 cases + 10 adversarial synonyms) |
| An unsafe dinner is cancelled and rerouted to a safe one, with the person and reason spoken and shown on the board | `features/meals/tools.ts` (`set_dinner`), `plan.rerouted` in `packages/contracts`, `board-page.ts` | `demo-journey.test.ts` ("cancels a peanut recipe, reroutes…", "keeps the day's existing safe dinner") |
| House rules like vegetarian Tuesdays are enforced | `allergen-verifier.ts` (`dayRules`) | `allergen-verifier.test.ts`, `demo-journey.test.ts` |
| The LLM proposes and the verifier decides; a deterministic planner fills gaps or takes over if the LLM fails | `features/meals/planner.ts`, `jobs.ts` | `demo-journey.test.ts` (unsafe LLM picks replaced; junk reply → fallback) |
| Chores are split fairly by effort, carrying history across weeks; children only get small jobs | `features/chores/rotation.ts` | `rotation.test.ts` (8-week fairness bound) |
| Hands-free cook-along with timers pushed to the TV; a running timer survives step changes, so a TV that loads mid-recipe still shows it | `features/cook/tools.ts`, `app.ts` (SSE) | `demo-journey.test.ts`, `app.test.ts` (SSE resume), `features/cook/tools.test.ts` |
| The Fire TV app shows the live "Dinner Departures" board: split-flap dinners, tonight lit amber, the cook-along step and countdown, tonight's dishes person | `apps/tv/src/App.tsx`, `apps/tv/src/logic/board.ts`, `apps/tv/src/components/` | `apps/tv/test/board.spec.ts`, `App.spec.tsx`; run on the Vega Virtual Device |
| The TV plays the cancel moment: the unsafe dinner struck through as CANCELLED · ALLERGY above its safe replacement, with a red ticker naming who is allergic | `apps/tv/src/logic/model.ts` (`plan.rerouted`), `components/BoardTable.tsx`, `components/Ticker.tsx` | `apps/tv/test/model.spec.ts`, `board.spec.ts`; run on the Vega Virtual Device |
| The TV follows the event feed without `EventSource`, reconnects from the last event it applied, and ignores duplicates | `apps/tv/src/api/sse.ts`, `apps/tv/src/logic/model.ts` | `apps/tv/test/sse.spec.ts`, `model.spec.ts` |
| The TV works out "tonight" in the household's timezone (the Vega Virtual Device clock is UTC) | `apps/tv/src/logic/time.ts` | `apps/tv/test/time.spec.ts` |
| The TV's D-pad buttons call the same tools Alexa uses | `apps/tv/src/components/Controls.tsx` → `POST /api/tools/:name` | `apps/tv/test/App.spec.tsx` |
| Every tool answers within Alexa+'s 500 ms budget | Lambda arm64 1024 MB + EventBridge warm-up (`infra/lib/homebase-stack.ts`) | [`eval/latency.md`](eval/latency.md): 200 live calls, p95 101 ms |
| Households can export or delete all their data; the public demo household can't be wiped | `features/household/data-tools.ts`, `lib/store.ts` | `data-tools.test.ts` |
| MCP spec 2025-11-25 over Streamable HTTP | `@modelcontextprotocol/sdk` 1.32.1, `WebStandardStreamableHTTPServerTransport` in `app.ts` | `app.test.ts` (real MCP client) |

## Sponsor tech, and what depends on it

- **Alexa+ MCP add-on**: Homebase's 22 tools are designed for it (`addon/addon-package/addon.json`). Amazon's MCP Preview is opening to partners in phases and we're waitlisted, so the Alexa+ path is shown through the simulated Alexa+ experience on the live MCP server; see [`FRICTION_LOG.md`](FRICTION_LOG.md).
- **Alexa Skills Kit**: a classic skill, "home base", is the on-device voice front end, calling the same tools in-process (`apps/server/src/skill.ts`), so a real Echo or Fire TV drives the board.
- **Fire TV (Vega OS)**: the shared family screen, built with React Native for Vega (Vega SDK 0.24, `apps/tv`, spec in [`docs/04-tv-handoff.md`](docs/04-tv-handoff.md)). It follows the SSE feed, takes D-pad input and bundles the brand fonts; it runs on the Vega Virtual Device. `/board` shows the same board in any browser.
- **AWS**: Lambda with response streaming (MCP + SSE), DynamoDB, SQS, EventBridge, Amazon Bedrock (Claude) for meal planning and the simulated Alexa+ agent, and CDK for infrastructure. Without Bedrock, planning falls back to the deterministic planner.

## Evidence

- `npm test` runs 87 tests: contracts, allergen verifier, chore fairness, the full demo journey through a real MCP client (including cancel + reroute), SSE resume, cook timers, export/delete, the agent loop and the web pages.
- `npm --prefix apps/tv test` runs 33 tests for the Fire TV app: the event reducer (cancel moment, duplicates after reconnects, timers), the SSE parser and reconnects, the board rows, household-timezone dates, brand tokens and fonts, and an app render with a D-pad press.
- [`eval/latency.md`](eval/latency.md): live per-tool latency.
- [`eval/RESULTS.md`](eval/RESULTS.md): **37/40** right tool + arguments (Claude Haiku 4.5 on Bedrock as the client). The 3 misses are context-free cook-along commands ("next", "say that again?", "let's make dinner"), each run with no conversation history. Tool-selection accuracy on 40 casual household requests (agent-written at the team's request; same agent wrote the tool descriptions, so read the score as optimistic) (`npm --prefix apps/server run eval`).

## Responsible AI

- Allergy checks are deterministic code, not the LLM's judgment, and are tested against disguised ingredient names. Homebase still says plainly that it isn't medical advice (`/privacy`, `/terms`, add-on description).
- No voice recordings or payment data are stored. Board events expire after 7 days. Export and delete are one request each.
- The LLM only sees a household summary, pantry item names and recipe titles.

## AI-assisted development

Built by a two-person team with Claude Code. Humans chose the idea, the scope, the safety rules (deterministic allergen checks, a protected demo household, no LLM in the request path) and reviewed each milestone. Claude Code wrote most of the code and tests under those rules (see `CLAUDE.md`). The 40 eval requests in `eval/requests.json` were written by Claude Code at the team's request, in deliberately casual phrasing; because it also wrote the tool descriptions, the score may be optimistic.

## Limitations & what's next

- Alexa+ account linking (OAuth 2.1 + PKCE via Cognito) isn't built yet, so every call acts on the demo household. Next up: PLAN.md M5.
- The real Alexa+ deploy is waiting on CLI access (account allowlisting).
- The team's Fire TV runs Fire OS, which can't install Vega apps, so the TV app is shown on the Vega Virtual Device rather than a physical Vega device.
- The TV timer has no chime yet: Vega has no simple sound-effect API (see `FRICTION_LOG.md`). At zero the countdown turns red and reads TIME'S UP.
- Recipes come from a seeded library, plus LLM suggestions that must pass the verifier. There's no licensed recipe database.

## Run locally

```bash
npm ci && npm run install:all
npm test
npm run dev            # http://localhost:8787 (in-memory store, demo household loaded); open /sim
```

Fire TV app (needs the Vega Developer Tools; full steps in [`apps/tv/README.md`](apps/tv/README.md)):
```bash
cd apps/tv && npm install && npm run build:app
vega virtual-device start
vega run-app build/aarch64-release/homebasetv_aarch64.vpkg com.homebase.kitchenboard.main -d VirtualDevice
```

Deploy to your AWS account (us-east-1):
```bash
npm run deploy                                   # CDK; outputs ServerUrl, TableName
TABLE_NAME=<TableName> npm run seed
```

Project docs: [`PLAN.md`](PLAN.md) (build plan), [`HACKATHON_PLAN.md`](HACKATHON_PLAN.md), [`PROJECT.md`](PROJECT.md), [`RESEARCH.md`](RESEARCH.md), [`docs/BRAND.md`](docs/BRAND.md) ("Dinner Departures"), [`docs/`](docs/) (platform notes, data model, TV hand-off, video script), [`SUBMISSION.md`](SUBMISSION.md). License: MIT.
