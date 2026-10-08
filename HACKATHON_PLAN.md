# Hearth — Build, Ship, Shape: Amazon Developer Hackathon

**Pitch:** A busy two-adult household can plan the week's dinners, split the chores, and cook hands-free just by talking to Alexa+, instead of juggling a notes app, a group chat and a greasy phone screen, because a stateful Alexa+ MCP add-on remembers the household and drives a Fire TV "kitchen board" in real time.
**The moment:** Hands covered in flour, someone says *"Alexa, next step"* and the Fire TV moves to step 4 and starts its 8-minute timer. Then *"Alexa, who's on dishes tonight?"* gets the answer from a chore rota Alexa set up on Monday.
**The measured claim:** On a scripted set of 40 household requests, Hearth's tools are called correctly in **X/40** cases (target ≥ 34). p95 tool latency is **Y ms** against Alexa+'s 500 ms budget. A full recipe is cooked with **0 remote presses**. Measured by `eval/run_eval.ts` (MCP client replay) plus a latency log.
**Planned:** 2026-10-08 · **Deadline:** Fri 2026-10-23 12:00 PT = **14:00 CT** · **Submit by:** **Thu 2026-10-22 18:00 CT**

## 1. Hackathon Facts
| Field | Value | Source |
|---|---|---|
| Build window / deadline | Aug 31 – **Oct 23, 12:00 PT**. Judging Nov 9–20, winners ~Dec 3 | [rules](https://amazonappdev2026.devpost.com/rules) |
| Team size | Teams allowed; one Representative submits. We are 2 people (Chicago, CT) | rules §3 |
| Required tech | **Alexa+:** working self-hosted MCP server, spec **2025-11-25**, over Streamable HTTP (or a simulated Alexa+ path). The code must actually import and call the tech at runtime. **Fire TV:** runs on Fire OS/Vega; the video must show a real device or simulator | rules §4 |
| New-work rule | New, or significantly updated after Aug 31. We start fresh ✅ | rules §4 |
| AI-assistance rules | No ban and no disclosure format required. We disclose anyway in the README | rules (nothing found) |
| Submission package | Text description. **GitHub repo** (public + OSI license visible in About, OR private shared with testing@devpost.com + chris-trag, knmeiss, giolaq, anishamalde, mosesroth, emersonsklar). Clear setup/run instructions. **Video <3 min** on YouTube/Vimeo, public, showing it on the device, no copyrighted music. **Product Feedback** for each tool. Track(s) + mini-challenge(s) selected. Optional: feature requests and **friction log (up to +10% score)** | rules §4 |
| Prizes we target | **Alexa+ Track** 1st $25k + $15k AWS (also entering Fire TV Track; only one track prize can be won). **AWS Builder** mini $5k + $5k credits | rules §8 |
| Judges & method | Stage 1 pass/fail (fits theme and uses the required tech). Stage 2 has 4 equally weighted criteria. *"May utilize… automated AI-driven analysis"*, so treat it as **AI-assisted** | rules §6 |
| Credits | AWS promo credits **exhausted** (Oct 7 update), so stay inside the free tier | rules §4 |
| Alexa+ access | Free with Prime in the US (we have Prime). Dev testing uses the `alexa-ai` CLI + web simulator or a device | [Amazon](https://www.aboutamazon.com/md/news/devices/alexa-plus-available-free-prime-members-us), [quickstart](https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-quickstart.html) |
| MCP add-on constraints | Remote URL; **<500 ms round trip**; Streamable HTTP; OAuth 2.1 + PKCE if auth is used (no DCR); tool info refreshes only on `alexa-ai deploy`; MCP Apps for visuals | quickstart |

**UNVERIFIED:**
- Whether a dev-stage add-on can run without OAuth. This is tested in M0.
- Whether Alexa+ renders MCP Apps visuals on Fire TV or Echo Show.
- Whether the Vega simulator receives Alexa voice input. Our design doesn't depend on it.
- Whether "Primary Track(s)" allows entering two tracks. The wording suggests yes; confirm on the submission form.

**Could not access:** project gallery (unpublished). There are no past winners because this is the first edition.

## 2. Judging Model
Equal weights, so we need to be strong on all four and avoid any weak spot. Build effort ≈ 25% each, but the video and README carry Design and Impact for judges who don't install anything.

| Criterion | Weight | Evidence that will score it |
|---|---|---|
| **Tech Implementation**: how well it's built and how effectively it uses the required tech | 25% | MCP 2025-11-25 server over Streamable HTTP with real tools, state and `notifications`. Latency log proving <500 ms. Vega RN app. AWS pipeline (Lambda + DynamoDB + Bedrock async). Tests, eval, a README claim→file table |
| **Design**: a complete, coherent experience; an interaction model suited to the device | 25% | One flow across voice → TV → D-pad fallback. 10-foot UI. Focus states. Empty/loading/error states. Voice phrases designed for Alexa+ (example phrases in addon.json) |
| **Potential Impact**: a credible, specific case; an audience beyond the hackathon | 25% | Named household persona and a real household test (us). Before/after: apps and taps per dinner. Path to Alexa+ add-on certification and the Fire TV Appstore |
| **Quality of Idea**: creative vs obvious | 25% | Directly hits the rubric's "creative" list: agentic multi-step workflow, **state across sessions**, **media/cards (MCP Apps)**, cart building, and **voice + D-pad + visual in one flow**. Cross-device Echo/Alexa + Fire TV |
| Bonus: friction log | up to +10% | `FRICTION_LOG.md` maintained daily from M0, submitted in the form |

AI-assisted judging is possible, so the README claim→code table, spoken claims in the video and a reproducible eval are **mandatory**.

## 3. Winner Patterns for This Event
- This is the first edition, so there are no winners yet. The gallery is hidden. Cross-event base rates apply: a retellable moment, one measured claim, verification visible, voice/physical-world input, sponsor feature that carries real weight.
- The rubric names the "obvious" ideas to avoid: a single-turn Q&A bot, a basic MCP wrapper around an existing API, a basic streaming UI. Hearth must never look like "a recipe API behind MCP". **Memory across sessions + driving the TV + chores** is the difference.
- Amazon is visibly pushing **MCP add-ons, MCP Apps and Agent Skills** for Alexa+, and Vega OS for Fire TV. Using their newest surfaces in earnest is the sponsor-fit lever.
- Product feedback and the friction log are explicitly rewarded. DevRel judges want to learn what's broken, so honest, specific friction notes help us.

## 4. Idea Selection
### Scoring matrix (each criterion 1–5, equal weight; modifiers on the right)
| Idea | Tech | Design | Impact | Idea | Insider | Moment | Evidence | Buildable | Prizes | Risk | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **A+D Hearth** (household memory + chores + cook-along on TV) | 5 | 5 | 5 | 5 | 0 | 2 | 2 | 1 | 2 | −2 | **25** |
| A Cook-along only | 5 | 5 | 4 | 5 | 0 | 2 | 2 | 1 | 2 | −2 | 24 |
| B Fitness CV coach | 4 | 4 | 4 | 5 | 0 | 2 | 2 | 1 | 1 | −2 | 21 |
| D Chores/meal agent only | 4 | 3 | 4 | 3 | 0 | 1 | 2 | 2 | 2 | −1 | 20 |
| C Household-aware watch picks | 3 | 4 | 3 | 4 | 0 | 1 | 1 | 1 | 1 | −1 | 17 |

### Chosen: Hearth (A + D), decided by the user 2026-10-08
It hits the creative examples for Alexa+ (stateful, multi-step agentic workflow, cards) and Fire TV (multi-modal voice + D-pad + visual) at the same time. That lifts Quality of Idea and Design without leaving our two tracks. The household memory turns it from a single-turn recipe bot into an ongoing assistant, which is the Impact story.

### Runner-up (fallback if M0 fails)
**Hearth-Sim:** the same MCP server and Fire TV board, but the Alexa+ layer is the rules-sanctioned **simulated Alexa+ web app** (Bedrock/Claude as the agent calling our MCP tools). Use this if the real add-on can't deploy or test by Oct 11. Fallback 2: idea B (fitness coach).

### Novelty check
- Comparables: the native Alexa recipe experience on Echo Show, and chore apps like OurHome and Sweepy.
- Our difference: a **third-party, stateful household agent that drives your TV** and connects planning → chores → shopping → cooking in one flow.
- The hackathon gallery is hidden, so field saturation is unknown. Expect several "recipe MCP" entries; household memory + the Fire TV board is our moat.

### Scope cut list (explicitly OUT)
- Real Amazon checkout or purchasing (build the cart as a list plus an "add to Amazon cart" deep link at most).
- User accounts or multi-household sign-up (one seeded demo household; OAuth only if M0 proves it's required).
- Pantry photo recognition, nutrition tracking, Fire OS (Android) build, and phone app.

### Kill test (M0)
1. A minimal MCP server deployed to a public URL is reachable from Alexa+ through `alexa-ai deploy`. A spoken or typed utterance in the simulator calls our tool, and the result comes back.
2. A tool call changes state that a Vega app on the Fire TV picks up within ~1 s.

## 5. Evidence Plan
| Claim | Proof artifact | Where | Built in |
|---|---|---|---|
| 34+/40 household requests call the right tool with correct args | `eval/requests.yaml` + `eval/run_eval.ts` + `eval/RESULTS.md` | repo, README, video 2:20 | M3 |
| p95 tool latency < 500 ms | `eval/latency.md` from CloudWatch/log replay | repo, README | M3 |
| Memory across sessions | Demo: plan Monday, ask Thursday "what's for dinner" (state in DynamoDB) + an integration test | video, `server/test/memory.test.ts` | M2 |
| Hands-free cooking (0 remote presses) | Continuous video take | video | M4 |
| MCP spec 2025-11-25, Streamable HTTP | `server/src/index.ts` + Inspector screenshot | README table | M1 |
| AWS Builder: Lambda + DynamoDB + Bedrock (+ Kiro if used) | Architecture diagram + `infra/` | README, Product Feedback | M2/M5 |
| Responsible use | No real personal data; household data stays in our own table; delete-household tool | README | M5 |
| AI-assisted dev disclosure | README section: Claude Code built X; humans decided Y | README | M5 |
| Friction log | `FRICTION_LOG.md` (task, steps, expected vs actual, severity, workaround, suggestion) | repo + form | daily |

## 6. Tech Stack
*Pin exact versions in M0 after fetching current docs.*
- **MCP server:** TypeScript + `@modelcontextprotocol/sdk` (version supporting spec 2025-11-25), Streamable HTTP transport. Required tech.
- **MCP Apps visuals:** `@modelcontextprotocol/ext-apps`, for weekly-plan and chore cards. Hits the rubric's "media support".
- **Alexa+ add-on:** `alexa-ai` CLI (`new mcp` → `deploy`), plus the Add-on Agent Skill in Claude Code.
- **Hosting:** AWS Lambda (Function URL) or App Runner, Node 22. Must hit <500 ms: keep it warm, avoid cold-start-heavy deps. Fallback: Fly.io / Cloudflare Workers.
- **State:** DynamoDB, one table keyed by household (free tier).
- **Async AI:** Amazon Bedrock (Claude model), called **out of band** to draft the week's meal plan and chore split. The tool returns instantly ("drafting your plan, it'll be on the TV in a moment"); a worker Lambda fills it in. AWS Builder evidence.
- **TV realtime:** API Gateway WebSocket, or SSE/long-poll from Lambda (decide in M0). The Vega app subscribes using a pairing code.
- **Fire TV app:** React Native for Vega (Vega SDK + Vega Virtual Device simulator), tested on the real Fire TV device (confirm it runs Vega; otherwise the simulator for the Vega path, or build Fire OS RN).
- **Cost:** about $0 on the free tier, plus Bedrock at a few cents per plan. Set an AWS budget alarm at $10.

## 7. Timeline (wall-clock, America/Chicago)
| Fixed point | Target | % |
|---|---|---|
| Spec + contracts locked, **M0 kill test passed** | Sat Oct 10, 20:00 | ~15% |
| Skeleton deployed (server live + add-on deployed + TV app shows the board) | Mon Oct 12, 22:00 | ~30% |
| Core flow real end-to-end (plan → chores → cook-along on TV via Alexa+) | Thu Oct 15, 22:00 | ~55% |
| **FEATURE FREEZE** | **Mon Oct 19, 22:00** | ~78% |
| Rough-cut video + README draft | Tue Oct 20, 22:00 | ~85% |
| Final QA / pre-submit audit | Wed Oct 21, 22:00 | ~92% |
| **Submit** | **Thu Oct 22, by 18:00 CT** (deadline Fri 14:00 CT) | |

**Roles:**
- **Builder 1 (Server):** owns `server/`, `infra/`, `eval/`, the add-on and Alexa+ testing.
- **Builder 2 (TV):** owns `tv-app/` and the video edit.
- **Shared:** `contracts/` (change only by agreement), README, FRICTION_LOG.

**Human gates:** AWS account + Bedrock model access (Day 1), `alexa-ai configure` login (Day 1), Fire TV developer mode + Vega SDK install (Day 1), daily 20-min sync, record narration (Oct 20), YouTube upload + Devpost submit (Oct 22).

## 8. Milestones
### Milestone 0: Kill-test spike (Oct 8–10)
**Goal:** prove Alexa+ → our MCP tool → state → Fire TV works.
- [ ] H: Both: register on Devpost and form the team. Builder 1: AWS account, budget alarm, Bedrock model access, `alexa-ai` CLI installed + `configure`. Builder 2: Vega SDK + Virtual Device installed, Fire TV in developer mode — Done when: each tool's hello-world command succeeds — Type: H
- [ ] Fetch current docs (MCP spec 2025-11-25, TS SDK, Alexa+ MCP toolkit quickstart + test guide + auth, Vega RN getting started). Write `docs/NOTES.md` with pinned versions and the auth decision — Done when: NOTES.md lists versions + answers "is OAuth required at dev stage?" — Type: S
- [ ] `spike/mcp`: minimal Streamable HTTP server with an `echo_household` tool that writes a counter to DynamoDB, deployed publicly — Done when: MCP Inspector calls the tool against the public URL; latency logged — Type: S
- [ ] `alexa-ai new mcp` + `deploy` pointing at the spike; test in the web simulator — Done when: an utterance triggers the tool and Alexa speaks the result; screenshot saved — Type: S + H
- [ ] `spike/tv`: Vega RN app polling or subscribing to the counter — Done when: the number on the Fire TV changes within ~1 s of the Alexa utterance — Type: S
- [ ] H: **Go/No-go.** Fail on the Alexa+ deploy → switch to Hearth-Sim (record in §10) — Type: H

### Milestone 1: Skeleton live (Oct 10–12)
- [ ] `contracts/`: TypeScript types for Household, Member, MealPlan, Recipe/Step, Chore, CookSession, ShoppingList; tool names + JSON schemas; TV event schema — Done when: both builders sign off; typecheck passes — Type: S + H
- [ ] Monorepo (`server/`, `tv-app/`, `contracts/`, `infra/`, `eval/`), MIT LICENSE, CI (lint + typecheck + test), CLAUDE.md/PROJECT.md — Done when: CI green on main — Type: S
- [ ] `infra/` (CDK or SAM): Lambda/Function URL, DynamoDB, WebSocket or SSE channel, Bedrock IAM — Done when: `deploy` from clean checkout works — Type: S
- [ ] Seed script: demo household "The Patels": 2 adults, 1 kid, vegetarian Tuesdays, peanut allergy, pantry list, 12 recipes — Done when: `npm run seed` is idempotent — Type: S
- [ ] TV app shell: pairing-code screen → Kitchen Board (This Week / Chores / Now Cooking tabs), D-pad focus — Done when: it runs on the Fire TV showing seeded data — Type: S

### Milestone 2: Core flow (Oct 12–15)
Tools (each <500 ms, unit-tested):
- [ ] `get_household` / `update_household_preferences` (diet, allergies, members, dislikes): memory across sessions — Done when: tests + Inspector — Type: S
- [ ] `plan_week` (enqueue a Bedrock job, return immediately) + worker Lambda writing MealPlan, respecting allergies; `get_plan(day)` — Done when: plan appears in DynamoDB in <30 s; allergy test passes — Type: S
- [ ] `assign_chores` (fair rotation + Bedrock explanation) / `whos_on(chore, day)` / `mark_chore_done` — Done when: tests — Type: S
- [ ] `start_cooking(recipe|today)` / `next_step` / `previous_step` / `repeat_step` / `start_timer` — push TV events — Done when: an E2E test drives a session and the TV receives events — Type: S
- [ ] `shopping_list` (plan minus pantry) / `add_to_list` — Done when: tests — Type: S
- [ ] TV: Now Cooking view (big step text, ingredients, countdown timer, progress), reacts to events; D-pad fallback mirrors the voice actions — Done when: on-device run from Alexa utterances — Type: S
- [ ] TV: This Week + Chores boards live-update — Type: S
- [ ] Add-on: `addon.json` descriptions + example phrases for each tool; redeploy; run through the 10 demo utterances in the simulator and on the Fire TV/Echo — Done when: all 10 work; **tag `demo-safe-1`** — Type: S + H

### Milestone 3: Evidence (Oct 15–17)
- [ ] `eval/requests.yaml`: 40 realistic household requests with expected tool + args (written by humans, not the agent) — Type: H
- [ ] `eval/run_eval.ts`: replays via an LLM-driven MCP client (Bedrock) and scores tool choice and args; `RESULTS.md` — Done when: reproducible with one command — Type: S + W
- [ ] Latency: log p50/p95 per tool → `eval/latency.md`; fix anything >400 ms — Type: S
- [ ] Real-household test: cook one real dinner with Hearth; note failures and measure "remote presses" + "apps opened" vs the usual way — Type: H

### Milestone 4: Moment & polish (Oct 16–19)
- [ ] MCP Apps cards for the week plan + chore rota (if Alexa+ renders them; otherwise skip and note in the friction log) — Type: S
- [ ] TV polish: 10-foot typography, transitions on step change, timer chime, empty/loading/error states, "Alexa says" toast showing the last voice command — Type: S
- [ ] Robustness: idempotent tool calls, graceful "no plan yet" responses, warm-up ping — Type: S
- [ ] `delete_household_data` tool + privacy note — Type: S

### ⛔ FEATURE FREEZE — Mon Oct 19, 22:00 CT

### Milestone 5: Submission assets (Oct 19–21)
- [ ] README: top line (what/who/number), Try it (setup + seeded household, simulator steps), video, problem, architecture diagram, **claim→file table**, eval results, sponsor tech and why, AI-dev disclosure, limitations, run locally — Type: S + H review
- [ ] `SUBMISSION.md`: Devpost fields + **Product Feedback** for each tool (Alexa+ MCP toolkit, alexa-ai CLI, Vega SDK, Bedrock, DynamoDB, Lambda) + feature requests + friction log export — Type: S + H
- [ ] Open-source the repo (MIT license visible in About), check no secrets in history — Type: H

### Milestone 6: Demo video (rough cut Oct 20, final Oct 21)
| Time | Beat (narrate every claim) |
|---|---|
| 0:00–0:15 | Kitchen, Fire TV on. "Dinner in a two-job household means five apps and a greasy phone. Hearth is an Alexa+ add-on that remembers your household and turns your Fire TV into the kitchen board." |
| 0:15–0:50 | "Alexa, plan dinners this week, Maya's allergic to peanuts." The board fills in. "Split the chores fairly." Rota appears. |
| 0:50–1:40 | Cut to "Thursday". "Alexa, what's for dinner?" (memory). "Let's cook it." TV switches to Now Cooking. Hands busy: "next step", "set the timer". **0 remote presses.** Quick D-pad fallback shot. |
| 1:40–2:00 | **The moment:** "Who's on dishes tonight?" "Arjun. And you're out of rice, I added it to the list." |
| 2:00–2:25 | Architecture: Alexa+ → MCP 2025-11-25 Streamable HTTP on Lambda → DynamoDB → WebSocket → Vega app; Bedrock drafts plans asynchronously to stay under Alexa's 500 ms budget. |
| 2:25–2:50 | "34/40 requests correct, p95 Xms. Limits: one household, no checkout yet. Next: Appstore + certification." |
- [ ] H: record screen + phone footage of the real Fire TV (show the device in frame), narration, no copyrighted music; upload to YouTube (public), <3:00

### Milestone 7: QA & submit (Oct 21–22)
- [ ] Fresh-clone setup test by the other builder following only the README — Type: H
- [ ] Pre-submit audit (judging-playbook §5) + rules checklist: tracks Alexa+ and Fire TV, mini AWS Builder, repo URL, license visible, video public <3 min, Product Feedback, friction log — Type: H
- [ ] **Submit by Thu Oct 22, 18:00 CT** — Done when: Devpost confirmation email received — Type: H

## 9. Risks & Contingencies
| Risk | Likelihood | Mitigation / fallback |
|---|---|---|
| Alexa+ add-on deploy/testing blocked (allowlist, OAuth, region) | Med | M0 tests first. Fallback: Hearth-Sim (simulated Alexa+ web app, allowed by the rules) |
| OAuth 2.1 required even at dev stage | Med | Use a minimal hosted OAuth (Cognito supports PKCE) with one demo user. Budget 2 S |
| >500 ms tool latency (cold starts) | Med | Provisioned concurrency or a warm ping; no LLM in the request path; fall back to App Runner |
| Fire TV device isn't Vega OS | Med | Use the Vega Virtual Device for the Vega build and show it in the video; or RN for Fire OS on the device |
| Alexa+ calls the wrong tool | Med | Precise tool descriptions + example phrases; eval loop catches it; fewer, clearer tools |
| Scope creep across 2 builders | High | Cut list, contracts-first, feature freeze Oct 19 |
| Video takes longer than expected | High | Rough cut Oct 20, shot list ready by Oct 17 |

## 10. Notes & Decisions
- 2026-10-08: User chose a mix of A (cook-along on TV) + D (household chores/meal agent). Team of 2 using Claude Code, Chicago timezone, has Prime (and so Alexa+), and a Fire TV device. Primary track **Alexa+** (also entering Fire TV), mini **AWS Builder**.
- 2026-10-08: Design rule: no LLM calls inside MCP tool requests (500 ms budget). Bedrock runs asynchronously only.

## Agent Rules (also in CLAUDE.md)
- Before using any library/SDK/API (MCP SDK, Alexa+ toolkit, Vega SDK, AWS), fetch its latest official docs; never code from memory.
- Never modify tests to make them pass. Run lint + typecheck + tests before marking a task done.
- Respect file ownership: Server agent owns `server/ infra/ eval/`; TV agent owns `tv-app/`; `contracts/` changes only with both humans' agreement.
- Every MCP tool must respond in <500 ms; never call Bedrock in the request path.
- After FEATURE FREEZE (Oct 19 22:00 CT): bug fixes, polish, evidence and submission assets only.
- Never delete seeded demo data. Never commit secrets.
- Log any SDK/doc friction to FRICTION_LOG.md as you hit it.
- Keep PROJECT.md current. Commit at every milestone; small commits throughout.
- Do not put instructions aimed at judges or AI reviewers in the repo, README, or video. Be clear and truthful only.
