# Homebase

> An Alexa+ add-on and Fire TV app that act as a household's shared memory: who's in the family, allergies and diets, pantry, a fair chore rota and the week's dinners. Run by voice and shown on the family TV, for busy multi-person households.

> **Sequencing:** until the hackathon submission (Thu 2026-10-22 18:00 CT), [`HACKATHON_PLAN.md`](HACKATHON_PLAN.md) governs scope and dates. Milestones 0–4 below are the same work, organised as a product. Milestones 5+ start after submission.

---

## Viability Summary

| | |
|---|---|
| **Build it?** | **weekend-prototype-first.** The user chose a full product plan anyway (2026-10-08); see Notes & Decisions |
| **Market** | crowded-with-gap. Alexa+ natively does meal plans and Echo Show cook-along; the gap is persistent household memory + fair chore rota on a shared TV surface |
| **Demand** | moderate. "Planning our family dinners is a significant friction point in our lives" (HN, recurring 2018–2026); no willingness-to-pay evidence |
| **Direction** | tailwind (moderate). Alexa+ MCP add-ons + MCP Apps launched July 2026; family-logistics AI pre-seed rounds Sept 2026 |
| **Feasibility** | medium-to-hard. Spike: Alexa+ add-on → backend → Vega app in real time |
| **Free to build** | mostly. ~$1–5/mo (LLM tokens + auth); AWS free-plan credits expire after 6 months |
| **Monetization** | deferred. Household subscription (~$29/yr) sold on the web, outside Alexa, only after the retention gate passes |

**In two sentences:** Amazon already covers the meal and cook-along basics, and third-party Alexa add-ons have no proven way to earn money. Homebase only has a reason to exist if households keep using its memory and chore rota, so this plan puts a **retention gate** before any monetization work.

---

## Research Findings

> Full evidence: [`RESEARCH.md`](RESEARCH.md).

- **Positioning / wedge:** "the household's shared memory and fair rota." Not "meal planning on Alexa": Amazon owns that. Cook-along on the TV is a demo feature, not the moat.
- **The spike:** Alexa+ can't target a third-party Fire TV app. **Approach:** MCP tools write state; the Vega app holds an **SSE** subscription to our backend.
- **Platform constraints:**
  - MCP spec 2025-11-25 over Streamable HTTP, US-only.
  - <500 ms round trip is a certification requirement.
  - Household tools are user-specific, which triggers **Tier 2 account linking (OAuth 2.1 auth code + PKCE)**.
  - Tool info refreshes only on `alexa-ai deploy`.
- **Cost flags:**
  - No clean commercial recipe-data license, so recipes are LLM-generated and must pass an **allergen verifier**.
  - API Gateway WebSocket's free tier lasts 12 months, so we use SSE instead.
  - AWS free plan lasts 6 months.
- **Monetization:** deferred to M8, gated on retention data.
- **Open questions a prototype should answer:**
  - Can families actually see the TV while cooking? Or is the TV the "family board" and Echo Show 15 the kitchen surface?
  - Is Alexa+ fast and reliable enough to depend on?
  - Does Alexa+ already cover chores or pantry natively? Test hands-on.
  - Which Fire TV models run Vega?

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Amazon ships native chores/household memory in Alexa+ | med | high | Keep data portable (export), keep the web + TV surface independent of Alexa; the add-on is one channel |
| Alexa+ add-on can't be deployed/tested, or account linking is blocked | med | high | M0 proves it first; fallback = simulated Alexa+ web voice layer (allowed for the hackathon) |
| Alexa+ latency/bugs ruin UX (HN: "takes way too long") | med | high | Tools <200 ms target; idempotent tools; TV/D-pad and web fallbacks for every action |
| Third-party Alexa integrations break silently (AnyList, March 2026) | med | med | Synthetic monitor calling the add-on daily; status banner on TV |
| LLM-generated recipe violates an allergy | med | high | Deterministic allergen verifier blocks plans; ingredient-level allergen tags; disclaimer; never claim medical safety |
| Vega only on newer sticks; Fire OS fragmentation | high | med | Ship Vega first; web board (`apps/web/board`) works on any browser/TV; Fire OS build is post-launch |
| No monetization path inside Alexa | high | med | Sell on the web; gate M8 on retention |
| AWS free plan ends after 6 months | high | low | Expected cost <$5/mo; budget alarm at $10 |
| Naming collision (Hearth Display) | — | — | Renamed to **Homebase**; check trademark before launch (M7) |

---

## Tech Stack

> Versions checked with `npm view` on 2026-10-08 (Node v24.18.0 local). Re-check before coding, and **fetch official docs before using any API.**

| Layer | Choice | Version | Reason |
|---|---|---|---|
| Voice channel | **Alexa+ MCP add-on** via `alexa-ai` CLI | spec 2025-11-25 | Required by the hackathon; a household voice channel already in homes |
| MCP server | `@modelcontextprotocol/sdk` (Streamable HTTP) on **Hono** | 1.32.1 / hono 4.13.13 | Official SDK; Hono is light and Lambda-friendly (fast cold start for the <500 ms budget) |
| MCP visual cards | `@modelcontextprotocol/ext-apps` | 2.0.3 | Plan/rota cards on Echo Show + mobile |
| TV app | **React Native for Vega** (Vega SDK + Virtual Device) | per Vega docs (RN 0.72/0.83) | Fire TV's new OS; SSE subscriber |
| Web app | **Vite + React** SPA (setup, account-linking login, board for any TV/browser, data export) | latest stable at M1 | No SEO need; static hosting |
| Shared types | `packages/contracts` (TS + **zod**) | zod 4.6.5, TS 7.0.2 | Three consumers (server, TV, web), so a package is justified |
| Backend runtime | **AWS Lambda** (Node 24) + Function URL; **response streaming** for SSE | — | Free tier 1M req/mo; AWS Builder evidence |
| Database | **DynamoDB** on-demand, single table | @aws-sdk 3.x | Pennies at our scale; serverless; fits household-keyed access |
| Async AI | **Amazon Bedrock**, Claude Haiku 5.5 (verify Bedrock availability; fallback: Claude API direct) | @anthropic-ai/bedrock-sdk 0.34.4 | ≈$0.001/weekly plan; never in the request path |
| Auth / account linking | **Amazon Cognito** user pool as the OAuth 2.1 auth server (auth code + PKCE, RFC 9728 metadata served by our server) | — | Suggested by the Alexa+ docs; AWS-native. Revisit Better Auth 1.7.7 (OAuth provider) if Cognito doesn't fit the metadata requirements |
| IaC | **AWS CDK** | aws-cdk-lib 2.273.0 | One `cdk deploy` for everything |
| Static hosting | S3 + CloudFront (web app) | — | Same account; free-tier friendly |
| Testing | **Vitest** (unit/integration), **Playwright** (web E2E), eval harness for tool selection | vitest 5.0.3 / @playwright/test 1.64.0 | |
| CI | GitHub Actions: lint, typecheck, test; CDK synth | — | |
| Errors/monitoring | CloudWatch logs + alarms; Sentry free tier from M7 | — | |
| Payments | Stripe Billing + customer portal (M8, only if gate passes) | — | Per-transaction only |

**Deliberately skipped:**
- Recipe API (licensing unclear).
- WebSockets (SSE instead).
- Native mobile app (web works on phones).
- Fire OS (Android) build until after launch.
- Analytics SDK: retention is measured from our own DynamoDB events. No third-party tracking for a family-data product.

---

## Project Structure

```
repo-root/
├─ apps/
│  ├─ server/              # Hono + MCP server, SSE stream, Bedrock worker (Lambda handlers)
│  │  └─ src/{app,features/{household,meals,chores,pantry,cook,shopping},lib}
│  ├─ tv/                  # React Native for Vega app (Kitchen Board)
│  └─ web/                 # Vite React: setup, account-linking login, browser board, export
├─ packages/
│  └─ contracts/           # zod schemas + TS types: entities, tool I/O, SSE events
├─ infra/                  # AWS CDK app
├─ eval/                   # tool-selection eval set + runner + results
├─ addon/                  # alexa-ai add-on package (addon.json, media)
├─ docs/                   # 01-architecture.md, 02-auth-flow.md, 03-data-model.md, …
├─ HACKATHON_PLAN.md · PLAN.md · PROJECT.md · RESEARCH.md · FRICTION_LOG.md · CLAUDE.md
├─ package.json            # delegating scripts
├─ .env.example
└─ README.md
```

**Conventions**
- `packages/contracts` exists from M1 because there are 3 consumers; still **no npm workspaces**. Consumers import via a TS path alias / relative build, so `node_modules` isn't hoisted. If that causes friction, adopting workspaces is a logged decision.
- Root scripts delegate: `npm --prefix apps/server run test`, etc. `npm test` runs all.
- `docs/` filenames are zero-padded kebab-case.
- **Fetch the latest official docs before coding against any library.**
- Keep `PROJECT.md` in sync.

---

## Environment Variables

```
# Required
AWS_PROFILE=                 # local AWS credentials profile for cdk deploy
AWS_REGION=us-east-1         # Alexa+ is US-only; keep infra in us-east-1
BEDROCK_MODEL_ID=            # Claude Haiku 5.5 model ID on Bedrock (verify in console)
TABLE_NAME=                  # set by CDK output
COGNITO_USER_POOL_ID=        # set by CDK output
COGNITO_CLIENT_ID=           # Alexa account-linking client (CDK output)
COGNITO_DOMAIN=              # hosted auth domain (CDK output)
PUBLIC_BASE_URL=             # canonical MCP server URL (resource indicator)

# Optional
ANTHROPIC_API_KEY=           # fallback if Bedrock model access is unavailable
SENTRY_DSN=                  # from M7
STRIPE_SECRET_KEY=           # M8 only, test mode
```

---

## Milestones

### Milestone 0: Spike (Oct 8–10)
**Goal:** prove Alexa+ → MCP tool → DynamoDB → SSE → Vega app, under 500 ms, and settle the auth question.

Tasks:
- [ ] Human: Devpost registration; AWS account + $10 budget alarm + Bedrock model access; `alexa-ai` CLI installed and `configure`d; Vega SDK + Virtual Device installed; Fire TV registered as a developer device (record model + OS in `docs/NOTES.md`) — Done when: each CLI's hello-world command succeeds
- [ ] Fetch current docs (MCP spec 2025-11-25, TS SDK 1.32.x, Alexa+ MCP toolkit overview/quickstart/auth/testing, Vega RN getting started, Lambda response streaming) and write `docs/01-platform-notes.md` — Done when: the file answers (a) is account linking required at dev stage, (b) the MCP Apps surfaces, (c) SSE/fetch-streaming support in Vega RN
- [ ] `spike/server`: one `bump_counter` tool + `GET /events` SSE endpoint on Lambda (Function URL, streaming), writing to DynamoDB — Done when: MCP Inspector calls the tool on the public URL; `curl -N /events` shows the event; p95 of 20 calls <500 ms logged
- [ ] `alexa-ai new mcp` + `deploy` to the spike URL; test in the web simulator — Done when: an utterance triggers `bump_counter` and Alexa replies; screenshot in `docs/`
- [ ] `spike/tv`: Vega app subscribing to `/events` — Done when: the number on the Fire TV changes within ~1 s of the Alexa utterance
- [ ] Human: go/no-go recorded in Notes & Decisions (fallback: simulated Alexa+ web voice layer)

### Milestone 1: Scaffold (Oct 10–12)
**Goal:** the monorepo builds, deploys with one command, and CI is green.

Tasks:
- [ ] Create `apps/server`, `apps/tv`, `apps/web`, `packages/contracts`, `infra`, `eval`, `addon`, `docs` per Project Structure; root delegating `package.json`; MIT LICENSE — Done when: `npm run build` builds all three apps
- [ ] `packages/contracts`: zod schemas for Household, Member (name, role, allergies[], diets[], dislikes[]), PantryItem, Recipe (ingredients with allergen tags, steps with timerSec), MealPlan, Chore, ChoreAssignment, CookSession, ShoppingItem; tool input/output schemas; SSE event union — Done when: `vitest run packages/contracts` round-trips valid/invalid fixtures
- [ ] Lint (ESLint) + typecheck + Vitest in every package; one passing test each — Done when: `npm run lint && npm run typecheck && npm test` green
- [ ] `infra/` CDK stack: DynamoDB table (pk/sk + GSI1), server Lambda + Function URL (streaming), worker Lambda + SQS queue, S3+CloudFront for web, Cognito user pool + app client + domain — Done when: `npx cdk deploy` from clean checkout outputs URLs; `/health` returns 200
- [ ] GitHub Actions: install, lint, typecheck, test, `cdk synth` — Done when: the workflow passes on push
- [ ] Seed script `apps/server/scripts/seed.ts`: demo household "The Patels" (2 adults, 1 child, peanut allergy, vegetarian Tuesdays, 20 pantry items, 12 verified recipes) — Done when: `npm run seed` is idempotent (running twice → same item count)
- [ ] Update PROJECT.md, CLAUDE.md, `.env.example` — Done when: committed
- [ ] **Brand & UI (human gate):** run the `brand-studio` skill: 3–5 directions for a 10-foot TV UI + web, user picks, writes `BRAND.md` + tokens in `packages/contracts/tokens` (or `apps/*/src/theme`) — Done when: `BRAND.md` + token files exist and both humans approve
- [ ] Gate: lint, typecheck, full test suite pass

### Milestone 2: Core Feature: household memory + chores + cook-along (Oct 12–15)
**Goal:** by voice, a household plans the week, splits chores, and cooks hands-free with the TV following along.

Tasks (each tool: <200 ms target, unit tests colocated, idempotency key where it writes):
- [ ] `features/household`: `get_household`, `update_member_preferences` (allergies/diets/dislikes) — Done when: tests pass; Inspector call round-trips
- [ ] `features/pantry`: `list_pantry`, `add_pantry_items`, `remove_pantry_items` — Done when: tests pass
- [ ] `features/meals`: `plan_week` enqueues an SQS job and returns "drafting" immediately; worker calls Bedrock with household context → MealPlan; `get_plan(day)` — Done when: the plan lands in DynamoDB <30 s in an integration test with a mocked Bedrock
- [ ] `features/meals/allergen-verifier.ts`: deterministic check of each recipe's ingredients vs every member's allergies (tag table + synonyms, e.g. "groundnut"→peanut); rejected recipes are regenerated once, then dropped with a reason — Done when: 30 fixture cases pass incl. 10 adversarial synonyms
- [ ] `features/chores`: `set_chores`, `assign_chores` (deterministic fair rotation weighted by effort + history; LLM only writes the friendly explanation, async), `whos_on(chore, day)`, `mark_chore_done`, `chore_balance` — Done when: fairness test: over 8 simulated weeks, the effort difference between members ≤ 1 chore-unit
- [ ] `features/cook`: `start_cooking(recipe|today)`, `next_step`, `previous_step`, `repeat_step`, `start_timer` → emit SSE events — Done when: an integration test drives a session and an SSE client receives ordered events
- [ ] `features/shopping`: `shopping_list` (plan ingredients minus pantry), `add_to_list`, `check_off` — Done when: tests pass
- [ ] `lib/sse.ts` + `GET /households/:id/events` (auth'd by a TV pairing token) with heartbeat + resume via Last-Event-ID — Done when: reconnect test replays missed events
- [ ] `apps/tv`: pairing-code screen (code shown on TV, entered on web) → Kitchen Board tabs: This Week / Chores / Now Cooking / Shopping; consumes SSE; D-pad actions call the same backend endpoints — Done when: on Vega Virtual Device + real Fire TV, the board updates from Alexa utterances
- [ ] `addon/addon.json`: tool descriptions + example phrases; `alexa-ai deploy` — Done when: the 12 scripted demo utterances work in the simulator; tag `demo-safe-1`
- [ ] E2E: script `eval/e2e-demo.ts` drives MCP tool calls for the demo journey and asserts SSE events + DynamoDB state — Done when: passes locally and in CI
- [ ] Gate: lint, typecheck, full test suite pass

### Milestone 3: Data layer hardening + evidence (Oct 15–17)
**Goal:** schema stable, latency proven, tool-selection quality measured.

Tasks:
- [ ] `docs/03-data-model.md`: single-table access patterns; migration-free versioned item schema (`v` attr) — Done when: every tool's access pattern is listed and covered by a test
- [ ] `delete_household_data` + `export_household` (JSON) tools and web buttons — Done when: tests confirm zero items remain after delete; export validates against contracts
- [ ] `eval/requests.yaml`: 40 human-written household requests with expected tool + args; `eval/run_eval.ts` scores an LLM MCP client against the tools → `eval/RESULTS.md` — Done when: reproducible with `npm run eval`
- [ ] Latency report `eval/latency.md` (p50/p95 per tool from 200 replayed calls) — Done when: all tools p95 <500 ms (target <200)
- [ ] Gate: lint, typecheck, full test suite pass

### Milestone 4: UI/UX (Oct 16–19; hackathon FEATURE FREEZE Mon Oct 19 22:00 CT)
**Goal:** a real family can use the TV board and the web app without explanation.

Tasks:
- [ ] TV per `BRAND.md`: 10-foot typography, focus states, step-change transitions, timer chime, "Alexa heard: …" toast, empty/loading/offline states — Done when: manual path: pair → This Week → Now Cooking via voice → "next step" ×3 → timer fires, all with no visual glitches on the device
- [ ] MCP Apps cards for week plan + chore rota (if rendered on Echo Show/mobile; log to FRICTION_LOG otherwise) — Done when: visible in the simulator's Echo Show 15 surface
- [ ] Web per `BRAND.md`: household setup wizard (members, allergies, chores), pairing-code entry, browser board (`/board`) for any TV/laptop, export/delete — Done when: Playwright test of setup → pair → board passes
- [ ] Gate: lint, typecheck, full test suite pass
- [ ] **→ Hackathon:** HACKATHON_PLAN.md Milestones 5–7 (README, video, QA, submit by Thu Oct 22 18:00 CT)

### Milestone 5: Auth: account linking (Oct 12–19, parallel track owned by Builder 1; finish post-hackathon if dev stage allows unauthenticated use)
**Goal:** each household's data is private behind Alexa account linking and web login.

Tasks:
- [ ] Serve RFC 9728 protected-resource metadata + `/.well-known/oauth-authorization-server` pointing at Cognito; 401 without `WWW-Authenticate` for unauthenticated MCP calls — Done when: Alexa+ dev-stage account linking completes in the simulator
- [ ] Map Cognito `sub` → householdId; every tool scopes by it; multi-member households via invite link — Done when: test proves household A's token can't read household B
- [ ] Web login via Cognito hosted UI (PKCE) — Done when: Playwright login test passes
- [ ] Gate: lint, typecheck, full test suite pass

### Milestone 6: Pilot & retention gate (Oct 26 – Nov 22)
**Goal:** evidence on whether households keep using it. This decides whether M8 happens.

Tasks:
- [ ] Recruit 5–10 US households with Alexa+ (friends/family, hackathon audience); onboarding doc `docs/04-pilot.md` — Done when: ≥5 households paired
- [ ] Usage events in DynamoDB (tool called, board viewed, chore done; no content) + weekly report script — Done when: `npm run report` prints weekly actives per household
- [ ] Synthetic monitor (EventBridge daily) calling the add-on health tool; CloudWatch alarm — Done when: alarm fires on a forced failure
- [ ] Human: 15-min interviews with each household at week 2 and week 4; notes in `docs/05-pilot-findings.md`
- [ ] **Retention gate:** ≥50% of households active in week 4 AND ≥3 say they'd pay. Pass → M7–M8. Fail → stop or pivot (record in Notes & Decisions)

### Milestone 7: Deploy hardening & certification (after gate)
**Goal:** a certified public add-on and production-ready backend.

Tasks:
- [ ] Prod stage in CDK (separate table/user pool), Sentry, CloudWatch dashboards — Done when: `cdk deploy -c stage=prod` works; Sentry receives a test error
- [ ] Privacy policy + terms pages on the web app (household data, no ads, export/delete) — Done when: URLs live and referenced in `addon.json`
- [ ] `alexa-ai submit` for certification; fix feedback — Done when: add-on certified
- [ ] Fire TV Appstore submission of the Vega app — Done when: app approved
- [ ] Trademark/name check for "Homebase" (note: "Homebase" is also a scheduling SaaS; confirm no class conflict) — Done when: decision logged
- [ ] Gate: lint, typecheck, full test suite pass

### Milestone 8: Monetization (only if the retention gate passed)
**Goal:** a household subscription works in Stripe test mode.

Tasks:
- [ ] Plan design: Free = 1 plan/week + chores + board; Plus ($3/mo or $29/yr) = unlimited plans, pantry auto-tracking, multiple boards — Done when: logged in Notes & Decisions
- [ ] Stripe Checkout + Billing portal on the web app; webhook → household `plan` field; tools enforce limits with a friendly voice message — Done when: test-mode subscription flips the limit in an integration test
- [ ] Gate: lint, typecheck, full test suite pass

### Milestone 9: Polish
**Goal:** no obvious errors, robust under Alexa+ quirks.

Tasks:
- [ ] Error-path audit: every tool returns a speakable error; TV offline/reconnect banner; worker retries + DLQ — Done when: chaos test (kill SSE, Bedrock 500s) passes
- [ ] Re-run `brand-studio` Phase 6 (rubric + accessibility audits) on the TV and web screens — Done when: issues fixed or logged
- [ ] Fire OS (Android) build or web-board guidance for non-Vega TVs — Done when: decision logged
- [ ] Gate: lint, typecheck, full test suite pass

---

## Claude Code Commands

> In every session, fetch the latest official docs for any library before coding against it, and keep `PROJECT.md` in sync. Until Oct 22, also obey HACKATHON_PLAN.md's freeze and dates.

**Start (Milestone 0):**
```
claude "Read PLAN.md, HACKATHON_PLAN.md and PROJECT.md. Complete Milestone 0 (spike), fetching the latest official docs for any library before using it. Report go/no-go. Stop after Milestone 0 and commit."
```

**Resume from any point:**
```
claude "Read PLAN.md and PROJECT.md. Find the first incomplete task and continue, fetching the latest official docs for any library before using it. Keep PROJECT.md in sync. Mark tasks done as you go. Commit when a milestone is complete."
```

**Test the current state:**
```
claude "Read PLAN.md and PROJECT.md. Without building anything new, test everything that's marked done. Report what works and what's broken."
```

---

## Notes & Decisions

- 2026-10-08 — Research verdict was **weekend-prototype-first**. The user chose **full product plan anyway**. Mitigation: a retention gate (M6) before monetization.
- 2026-10-08 — Renamed Hearth → **Homebase** (Hearth Display collision).
- 2026-10-08 — SSE over API Gateway WebSocket (simpler; WebSocket free tier is 12 months only).
- 2026-10-08 — Recipes are LLM-generated + a deterministic allergen verifier (no clean recipe-data license).
- 2026-10-08 — Cognito for account linking (Alexa docs suggest it; AWS Builder fit). Better Auth is the fallback.
- 2026-10-08 — Bedrock never runs in the MCP request path (500 ms certification requirement).
