# Homebase — Project Tracker

> Living context map. Any LLM or human should be able to read this file alone and understand what the project is, how it's built, and where things are. **Keep it in sync.**

_Last updated: 2026-10-22_

---

## What it is

Homebase is an Alexa+ add-on (a self-hosted MCP server) plus a Fire TV (Vega OS) app. Together they act as a household's shared memory: members, allergies and diets, pantry, a fair chore rota and the week's dinners. You talk to Alexa ("plan dinners this week", "who's on dishes?", "next step") and the family TV shows a "Dinner Departures" board that cancels unsafe dinners on screen and walks through recipes hands-free. Built first for Amazon's *Build, Ship, Shape* hackathon (feature freeze Mon 2026-10-19 22:00 CT; submit by Thu 2026-10-22 18:00 CT), then as a product if a pilot shows households keep using it.

---

## Stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Voice | Alexa+ MCP add-on (`alexa-ai` CLI; **Preview waitlisted**) → **simulated Alexa+** at `/sim`; **classic skill "home base"** for real Echo/Fire TV voice | MCP spec 2025-11-25; ASK SDK 2.14 | `skill/README.md` |
| MCP server | @modelcontextprotocol/sdk on Hono | 1.32.1 / 4.13.13 | AWS Lambda (Node 24, arm64) + Function URL with response streaming |
| TV | React Native for Vega (`apps/tv`, Builder 2) | Vega SDK 0.24.12112, RN 0.83 | spec: `docs/04-tv-handoff.md`; runs on the Vega Virtual Device; backstop web board at `/board` |
| Brand | "Dinner Departures" | — | `docs/BRAND.md` + `design/tokens.json` (source of truth) |
| Contracts | TypeScript + zod | 6.0.3 / 4.6.5 | `packages/contracts` (TS 6: typescript-eslint lacks TS 7 support) |
| Database | DynamoDB on-demand, single table, TTL on events | — | `docs/03-data-model.md` |
| AI | Bedrock Claude Haiku 4.5 (`us.` inference profile; 5.5 not enabled) | — | SQS worker for planning; `/api/sim/converse` for the simulator; never in MCP tools |
| Auth | Cognito (OAuth 2.1 + PKCE account linking) | — | not built yet (PLAN.md M5); every call acts on the demo household |
| IaC | AWS CDK | 2.273.0 | `npm run deploy` |
| Tests | Vitest + eval harness | 5.0.3 | 87 tests (server + contracts) + TV suite; `eval/latency.md`, `eval/RESULTS.md` |

> Versions checked 2026-10-08/11. Re-verify before coding against a library.

---

## Architecture

1. A user speaks to Alexa+ (or types/speaks on `/sim`). Alexa+ picks a Homebase MCP tool and calls `POST /mcp`; the simulator's Bedrock agent calls the same tools in-process.
2. The server Lambda runs the tool against DynamoDB and returns in ~70 ms (p95 101 ms over 200 live calls; budget 500 ms). An EventBridge ping every 5 min keeps it warm.
3. Every write appends a board event (`EVT#seq`). TVs load `GET /households/:id/state` once, then follow `GET /households/:id/events` (SSE; the server polls DynamoDB every 1 s; resume with `Last-Event-ID` or `?after=`).
4. `plan_week` enqueues to SQS. The worker Lambda asks Bedrock for picks, the **allergen verifier** decides, and a deterministic picker fills gaps or takes over.
5. `set_dinner` with an unsafe recipe cancels it, reroutes to a safe one, and emits `plan.rerouted`, which drives the board's `CANCELLED · ALLERGY` moment.
6. The TV's D-pad buttons call `POST /api/tools/:name`, the same registry as MCP.
7. The classic skill ("Alexa, ask home base …") runs on its own Lambda (`skill-lambda.ts`) and calls the same tools in-process; cooking turns keep the session open.

---

## Project structure

```
apps/server/            # Builder 1. Hono app: MCP, REST tools, SSE, /sim, /board, /privacy, /terms, /media
  src/features/         #   tools by domain: household (+data-tools), meals (planner, allergen-verifier), chores (rotation), cook, shopping, pantry
  src/lib/              #   tools registry, store (Dynamo/Memory), queue (SQS/Memory), agent (Bedrock tool loop), llm, docs, time, contracts re-export
  src/scripts/          #   seed, seed-data, bench, latency, live-journey, run-eval
  src/{app,lambda,local,worker,jobs}.ts, sim-page.ts, board-page.ts, legal-pages.ts, addon-media.ts (generated)
skill/                  # classic Alexa skill "home base": manifest, generated interaction model, skill-id.txt, simulate.py
apps/tv/                # Builder 2. Vega Fire TV app (Dinner Departures board); spec docs/04-tv-handoff.md; README inside
packages/contracts/     # shared zod schemas & types (both builders must agree on changes)
infra/                  # CDK stack: table, server + worker Lambdas, SQS + DLQ, warm-up rule
eval/                   # requests.json (40, agent-written), RESULTS.md (37/40), latency.md
addon/                  # Alexa+ add-on package draft (addon.json, media/)
design/                 # tokens.json, cancel-moment.html, brand option previews
scripts/                # make-addon-media.py (brand art from tokens)
docs/                   # 01 platform notes · 03 data model · 04 TV hand-off · 05 video script · BRAND.md
spike/                  # M0 spike (historical)
```

---

## Conventions

- **Where new code goes:** each tool lives in `apps/server/src/features/<domain>/` with a colocated `*.test.ts`, registered in `features/index.ts`. Shared types go in `packages/contracts` only.
- **File ownership:** Builder 1 owns `apps/server`, `infra`, `eval`, `addon`, `scripts`. Builder 2 owns `apps/tv`. `packages/contracts` changes need both builders.
- **Tools:** <500 ms, idempotent writes, speakable messages in the brand voice (name the person and the reason; never "error"), no LLM in the request path.
- **UI:** follow `docs/BRAND.md`; read colors and sizes from `design/tokens.json`.
- **Testing:** `npm test` (contracts + server). Live checks: `npm --prefix apps/server run journey|latency -- <ServerUrl>`, `npm --prefix apps/server run eval`.
- **Docs:** `docs/` filenames are zero-padded kebab-case.
- **Before coding any library:** fetch its latest official docs.
- Log SDK/doc friction to `FRICTION_LOG.md` (hackathon bonus).

---

## Current status

| Milestone | Status | Notes |
|---|---|---|
| 0. Spike | ◐ | MCP + SSE proven on Lambda. Real Alexa+ deploy blocked on CLI access (organizers asked) → simulated Alexa+ is the demo path |
| 1. Scaffold | ✅ (server side) | monorepo, CI, CDK deploy, seed. Brand done (`docs/BRAND.md`). `apps/tv` is Builder 2's |
| 2. Core feature | ◐ | 22 tools live + tested; cancel/reroute moment; `/sim` and branded `/board` live. Vega TV app built and running on the Vega Virtual Device (live SSE, D-pad, cancel moment). **Remaining: end-to-end acceptance run (docs/04 §7) and recording** |
| 3. Data + evidence | ✅ | data model, export/delete, latency p95 101 ms, eval 37/40 |
| 4. UI/UX | ◐ | `/board`, `/sim` and the Vega app in brand (tokens synced from `design/tokens.json`, fonts bundled). Freeze Mon Oct 19 22:00 CT |
| 5. Auth (account linking) | ☐ | after the hackathon unless CLI access requires it sooner |
| Hackathon M5–M7 (README, video, submit) | ◐ | README ✅, video script `docs/05`, Devpost draft `SUBMISSION.md`; record by Oct 19, rough cut Oct 20 |
| 6. Pilot & retention gate | ☐ | Oct 26 – Nov 22 |
| 7–9. Certify / Monetize / Polish | ☐ | gated on M6 |

**In progress now (2026-10-22, submission day):** Vega app acceptance run (docs/04 §7) on the Virtual Device, then record the demo video, paste its link into README and `SUBMISSION.md`, and submit on Devpost by 18:00 CT (hard deadline Fri 10-23 14:00 CT). Earlier note: Vega app acceptance run on the Virtual Device. Classic skill live in dev stage (verified via the Alexa simulator); next: test on the real Echo/Fire TV.
**Live server:** `https://koothznswwvs4koyux64x4bs3e0msbsb.lambda-url.us-east-1.on.aws`. MCP `/mcp`, simulator `/sim`, board `/board`, feed `/households/patels/events`. Redeploy with `npm run deploy`; reseed with `TABLE_NAME=<CDK output> npm run seed`.
**Next up:** record shots per `docs/05-demo-video-script.md` (TV shots from the Vega Virtual Device).

---

## Decision log

- 2026-10-19 — The team's Fire TV (Toshiba 65C350NU) runs Fire OS 8.1.8.0, which can't run Vega apps, so the Fire TV app targets and is recorded on the Vega Virtual Device. Live updates use SSE over XMLHttpRequest (verified on the device); "today" uses the household timezone because the Virtual Device clock is UTC. No timer chime (no simple Vega sound API).

- 2026-10-14 — Built classic Alexa skill "home base" (ASK CLI/SDK) as the on-device voice front end; verified the full journey via `ask smapi simulate-skill`. Invocation needs two words ("home base"). Node 24 required an async handler (friction log).

- 2026-10-14 — Alexa+ MCP Preview access waitlisted (phased rollout, no date). Alexa+ entry = live MCP server + simulated Alexa+. ASK CLI 2.30.7 installed, not yet configured.

- 2026-10-13 — `set_dinner` cancels unsafe dinners and reroutes to a safe one (keeps the day's existing safe dinner if there is one); new additive contract event `plan.rerouted` → **Builder 2 to confirm**. `/board`, `/sim` and add-on art rebuilt in the Dinner Departures brand. `get_plan`/`set_dinner` ignore a previous week's plan.
- 2026-10-13 — Backstop `/board` added so the demo survives if the Vega app slips (it doesn't count as the Fire TV app).
- 2026-10-11 — Eval: 40 agent-written requests (user's request, labelled), 37/40. Bedrock needed the Anthropic use-case form and a payment method.
- 2026-10-11 — Alexa+ CLI access blocked (allowlist); simulated Alexa+ path is the demo fallback. Haiku 4.5 on Bedrock. TS 6.0.3. SSE polls DynamoDB at 1 s. Demo household protected from deletion.
- 2026-10-08 — Idea: A+D mix (cook-along + household chores/meal agent). Tracks: Alexa+ (primary) + Fire TV; mini: AWS Builder.
- 2026-10-08 — Research verdict weekend-prototype-first; user chose full product plan with a retention gate.
- 2026-10-08 — Renamed Hearth → Homebase (Hearth Display collision).
- 2026-10-08 — SSE instead of WebSocket; Cognito for account linking; LLM recipes + allergen verifier; Bedrock async only.

---

## Glossary

- **MCP add-on** — a third-party capability Alexa+ calls through our MCP server.
- **Simulated Alexa+** — `/sim`: a Bedrock agent playing Alexa against the same tools (the rules' alternate path).
- **Dinner Departures** — the brand: the TV as a train-station departure board for dinner.
- **The cancel / reroute** — an unsafe dinner flips to `CANCELLED · ALLERGY`, the red ticker gives the reason, and a safe dinner takes its place (`plan.rerouted`).
- **Account linking / Tier 2 auth** — the OAuth 2.1 auth code + PKCE flow Alexa+ runs when a user-specific tool is first used.
- **Vega OS** — Amazon's new Linux-based Fire TV OS (React Native apps); only on newer sticks.
- **Allergen verifier** — a deterministic check that blocks any recipe containing a member's allergen, including disguised names.
- **Retention gate** — M6 go/no-go: ≥50% week-4 active households and ≥3 willing to pay.
