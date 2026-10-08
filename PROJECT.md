# Homebase — Project Tracker

> Living context map. Any LLM or human should be able to read this file alone and understand what the project is, how it's built, and where things are. **Keep it in sync.**

_Last updated: 2026-10-08_

---

## What it is

Homebase is an Alexa+ add-on (a self-hosted MCP server) plus a Fire TV (Vega OS) app. Together they act as a household's shared memory: members, allergies and diets, pantry, a fair chore rota and the week's dinners. You talk to Alexa ("plan dinners this week", "who's on dishes?", "next step") and the family TV shows the board and walks through recipes hands-free. Built first for Amazon's *Build, Ship, Shape* hackathon (submit by 2026-10-22 18:00 CT), then as a product if a pilot shows households keep using it.

---

## Stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Voice | Alexa+ MCP add-on (`alexa-ai` CLI) | MCP spec 2025-11-25 | Streamable HTTP, US-only, <500 ms |
| MCP server | @modelcontextprotocol/sdk on Hono | 1.32.1 / 4.13.13 | AWS Lambda (Node 24) + Function URL |
| Visual cards | @modelcontextprotocol/ext-apps | 2.0.3 | Echo Show / mobile |
| TV | React Native for Vega | per Vega SDK | subscribes via SSE |
| Web | Vite + React SPA | latest at M1 | setup, login, browser board, export |
| Contracts | TypeScript + zod | 7.0.2 / 4.6.5 | `packages/contracts` |
| Database | DynamoDB on-demand, single table | — | |
| AI | Bedrock Claude Haiku 5.5 (async worker via SQS) | — | never in the request path |
| Auth | Cognito (OAuth 2.1 + PKCE account linking) | — | |
| IaC | AWS CDK | 2.273.0 | |
| Tests | Vitest / Playwright / eval harness | 5.0.3 / 1.64.0 | |

> Versions checked 2026-10-08. Re-verify before coding against a library.

---

## Architecture

1. User speaks to Alexa+ (Echo / Fire TV / app). Alexa+ picks a Homebase MCP tool and calls `POST /mcp` with the account-linking bearer token.
2. The server Lambda validates the token → householdId, reads/writes DynamoDB, and returns in <500 ms (target <200).
3. Writes also append an event. The TV app holds `GET /households/:id/events` (SSE via Lambda response streaming) and re-renders.
4. Slow work (`plan_week`, chore explanations) is put on SQS. The worker Lambda calls Bedrock, runs the **allergen verifier**, writes results, and emits SSE events.
5. The web app (S3 + CloudFront) handles setup, Cognito login, TV pairing codes, the browser board, and export/delete.

---

## Project structure (planned; not yet scaffolded)

```
apps/server/      # MCP server + SSE + worker (features/{household,meals,chores,pantry,cook,shopping})
apps/tv/          # Vega Kitchen Board
apps/web/         # setup / login / board / export
packages/contracts/  # shared zod schemas & types
infra/            # CDK
eval/             # tool-selection eval + latency + e2e demo
addon/            # alexa-ai add-on package
docs/             # numbered kebab-case docs
```

---

## Conventions

- **Where new code goes:** each tool lives in `apps/server/src/features/<domain>/` with a colocated `*.test.ts`. Shared types go in `packages/contracts` only.
- **File ownership (2 builders):**
  - Builder 1: `apps/server`, `infra`, `eval`, `addon`.
  - Builder 2: `apps/tv`, `apps/web`.
  - `packages/contracts` changes only with both humans' agreement.
- **Tools:** <500 ms, idempotent writes, speakable error messages, no LLM in the request path.
- **Testing:** Vitest everywhere; Playwright for web; `npm run eval` for tool selection.
- **Docs:** `docs/` filenames are zero-padded kebab-case.
- **Before coding any library:** fetch its latest official docs.
- Log SDK/doc friction to `FRICTION_LOG.md` (hackathon bonus).

---

## Current status

| Milestone | Status | Notes |
|---|---|---|
| 0. Spike | ☐ todo | Alexa+ → MCP → DynamoDB → SSE → Vega |
| 1. Scaffold | ☐ | |
| 2. Core feature | ☐ | |
| 3. Data + evidence | ☐ | |
| 4. UI/UX | ☐ | hackathon freeze Mon Oct 19 22:00 CT |
| 5. Auth (account linking) | ☐ | parallel track |
| 6. Pilot & retention gate | ☐ | Oct 26 – Nov 22 |
| 7–9. Certify / Monetize / Polish | ☐ | gated on M6 |

**In progress now:** planning done.
**Next up:** M0 human setup (AWS, `alexa-ai configure`, Vega SDK, Fire TV dev mode).

---

## Decision log

- 2026-10-08 — Idea: A+D mix (cook-along + household chores/meal agent). Tracks: Alexa+ (primary) + Fire TV; mini: AWS Builder.
- 2026-10-08 — Research verdict weekend-prototype-first; user chose full product plan with a retention gate.
- 2026-10-08 — Renamed Hearth → Homebase (Hearth Display collision).
- 2026-10-08 — SSE instead of WebSocket; Cognito for account linking; LLM recipes + allergen verifier; Bedrock async only.

---

## Glossary

- **MCP add-on** — a third-party capability Alexa+ calls through our MCP server.
- **Account linking / Tier 2 auth** — OAuth 2.1 auth code + PKCE flow Alexa+ runs when a user-specific tool is first used.
- **Vega OS** — Amazon's new Linux-based Fire TV OS (React Native apps); only on newer sticks.
- **Kitchen Board** — the Homebase TV app (This Week / Chores / Now Cooking / Shopping).
- **Pairing code** — short code shown on the TV and entered on the web to bind a TV to a household.
- **Allergen verifier** — deterministic check that blocks any recipe containing a member's allergen.
- **Retention gate** — M6 go/no-go: ≥50% week-4 active households and ≥3 willing to pay.
