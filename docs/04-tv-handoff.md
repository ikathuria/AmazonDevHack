# 04 — Fire TV (Vega) app hand-off spec

**Owner:** Builder 2 · **Folder:** `apps/tv/` (yours alone; don't edit `apps/server`, `infra`, `packages/contracts` without agreeing first) · **Written:** 2026-10-13 (updated for BRAND.md the same day)

> **Needs your OK:** on 2026-10-13 the server side added one event type to `packages/contracts`, `plan.rerouted` (§4.2). It's additive, so older clients ignore it, but CLAUDE.md says contract changes need both of you. Reply in chat or on the commit if you object. · **Feature freeze:** Mon Oct 19, 22:00 CT · **Submit:** Thu Oct 22, 18:00 CT

## 1. Why this matters (read first)

Our Fire TV track entry is only valid if the **demo video shows the app running on a real Fire TV or the Vega Virtual Device** (rules §4). The backend is done and live; the TV app is the last thing on the critical path. Keep it **small, reliable and good-looking at 10 feet**: one screen, four panels, live updates, D-pad controls. No accounts, no settings and no navigation stack are needed.

**Reference implementation:** `apps/server/src/board-page.ts`, live at `<ServerUrl>/board`. It's the "Dinner Departures" board this app should be: same data flow, rows, cancel moment and buttons, on a 1920×1080 canvas. Open it on a laptop next to `<ServerUrl>/sim` and say things. **Design rules:** [`docs/BRAND.md`](BRAND.md) and [`design/tokens.json`](../design/tokens.json) (source of truth; never hard-code a hex or size), plus the animation reference [`design/cancel-moment.html`](../design/cancel-moment.html). Port the board's behavior to React Native for Vega; you don't need to invent any of it.

`<ServerUrl>` = `https://koothznswwvs4koyux64x4bs3e0msbsb.lambda-url.us-east-1.on.aws` (no auth; household `patels`).

## 2. Setup (fetch current docs; don't trust memory)

1. Install the Vega SDK + Vega Virtual Device by following Amazon's current getting-started guide: <https://developer.amazon.com/docs/vega/latest/vega-rn-overview.html>. React Native for Vega supports RN 0.72 / 0.83.
2. Check which OS your Fire TV runs (Settings → My Fire TV → About). Vega runs on newer sticks (e.g. Fire TV Stick 4K Select); a Fire OS (Android) device can't run a Vega app. In that case, record the demo on the Vega Virtual Device, which the rules accept.
3. Register the Fire TV as a developer device (sideloading works only on registered devices, via USB/CLI).
4. Scaffold the app **inside `apps/tv/`** with Vega's template. Keep its own `package.json`; the root `package.json` doesn't need changes until you want `npm run lint` to include it.
5. Log anything confusing or broken in `FRICTION_LOG.md` as you go (task, steps, expected vs actual, severity, workaround, suggestion). It's worth up to **+10%** of our score.

**Open question to answer early (day 1):** does Vega's RN networking support **`EventSource`/SSE or streaming `fetch`**? If not, use the long-poll fallback in §4.3. It's already supported by the server, so it costs nothing to switch.

## 3. The screen ("Dinner Departures")

One full-screen 1920×1080 view: a train-station departure board for dinner (see BRAND.md). Title-safe padding is 88 px horizontal and 64 px vertical, with the bottom 90 px reserved for the ticker. Top to bottom:

| Region | Shows | Data |
|---|---|---|
| **Header** | ■ amber square + `THE PATELS · DINNER DEPARTURES` (Archivo 900, 64 px) · clock `20:21 TUE` (JetBrains Mono 800, 64 px, amber) · a 4 px amber rule underneath | `state.household.name` |
| **Column heads** | `DAY  DINNER  STATUS` (mono 24 px, dim, letter-spaced) | |
| **Board rows** (max 5, 10 px gaps, no borders) | today → the next 4 days. Tonight's row is lit amber: `BOARDING TONIGHT`, or `NOW COOKING · STEP 2/5` when its recipe is cooking. Other rows show `ON TIME` in green. A cancelled row (dim, struck through, red `CANCELLED · ALLERGY`) sits above the rerouted row (status `REROUTED`). While drafting: `PLANNING…`; stale week: `LAST WEEK'S PLAN / ASK FOR A NEW PLAN` | `state.plan` + `plan.updated` + `plan.rerouted` |
| **Lower left: Now cooking** | `NOW COOKING · CHANA MASALA · STEP 1/5` (label), step text (40 px), timer `⏱ 14:56` (mono 64 px, amber; red `TIME'S UP` at 0). When nothing is cooking: `Heard: “…”` (last utterance) | `state.cook` + `cook.step` / `cook.timer` / `voice.heard` |
| **Lower right: Hero** | `DISHES · GATE SINK` label + tonight's dishes person in 120 px amber Archivo (`PRIYA`), then a `SHOPPING · CILANTRO · LIMES` line | `state.choreAssignments` (today, `choreId: "dishes"`), `state.shopping` |
| **Controls** | flap-tile buttons: START · ◀ BACK · REPEAT · NEXT ▶ · TIMER … PLAN WEEK · SPLIT CHORES · SHOPPING, plus a `● LIVE` / `RECONNECTING` indicator | §4.4 |
| **Ticker** (bottom, full-bleed) | red bar, only on alerts, scrolling right to left at 120 px/s, hidden 20 s after the last alert: `⚠ PEANUT SATAY NOODLES CANCELLED · MAYA HAS AN ALLERGY → REROUTED TO GARLIC SPINACH PASTA` | `plan.rerouted`; also `plan.blocked` when a fresh plan arrives |

**Signature moves (BRAND.md, must-have for the video):**
1. **Split-flap:** when a row value changes, its characters flip in sequence (70 ms each, 25 ms stagger).
2. **The cancel** (the demo's hero moment): on `plan.rerouted`, the cancelled row appears dimmed with a red status, the ticker slides up with the reason, and the rerouted row flaps to the safe dinner. Copy the timing from `design/cancel-moment.html`.
3. **Hero name:** the dishes person in 120 px amber.

Respect reduced motion (skip flips, swap values instantly). Keep one amber thing per area, and use red **only** for safety.

Today's weekday key: `["mon","tue","wed","thu","fri","sat","sun"][(new Date().getDay() + 6) % 7]`. The household timezone is `state.household.timezone` (America/Chicago); the device clock is fine for the demo. A plan is stale when `plan.weekOf` isn't this week's Monday.

## 4. API contract (all live now)

Types: `packages/contracts/src/index.ts` (zod). Import the types if your bundler allows, or copy the shapes below.

### 4.1 Load once: `GET /households/patels/state`
```json
{
  "household": { "id": "patels", "name": "The Patels", "timezone": "America/Chicago",
                 "members": [{ "id": "maya", "name": "Maya", "role": "child", "allergies": ["peanut"], "diets": [], "dislikes": [] }],
                 "dayRules": { "tue": "vegetarian" } },
  "plan": { "weekOf": "2026-10-12", "status": "ready",
            "days": { "mon": { "recipeId": "dal-tadka", "title": "Dal tadka" } },
            "blocked": [{ "title": "Peanut satay noodles", "reason": "peanut butter contains peanut and Maya is allergic" }] },
  "chores": [{ "id": "dishes", "name": "dishes", "effort": 2, "frequency": "daily" }],
  "choreAssignments": [{ "choreId": "cook", "memberId": "arjun", "day": "mon", "done": false }],
  "cook": { "session": { "recipeId": "chana-masala", "stepIndex": 0, "timerEndsAt": "2026-10-14T01:29:46.693Z" },
            "recipe": { "title": "Chana masala", "steps": [{ "text": "Rinse the rice and start it cooking.", "timerSec": 900 }] } },
  "shopping": [{ "name": "cilantro", "checked": false }],
  "lastSeq": 129
}
```
`plan` and `cook` may be `null`. If `cook.session.timerEndsAt` is in the future, start the countdown on load (the timer event may predate the app launching).

### 4.2 Follow: `GET /households/patels/events?after=<lastSeq>` (Server-Sent Events)
```
id: 128
event: cook.step
data: {"seq":128,"at":"…","event":{"type":"cook.step","session":{"recipeId":"chana-masala","stepIndex":0},"step":{"text":"Rinse the rice…","timerSec":900},"total":5}}

id: 129
event: cook.timer
data: {"seq":129,"at":"…","event":{"type":"cook.timer","endsAt":"2026-10-14T01:29:46.693Z","label":"Chana masala, step 1"}}
```
Event types (`event.type`) and what to do:

| type | payload | action |
|---|---|---|
| `plan.updated` | `plan` | replace plan (a `plan.rerouted` follows when a dinner was cancelled) |
| `chores.updated` | `assignments` | replace choreAssignments |
| `household.updated` | `household` | replace household |
| `shopping.updated` | `items` | replace shopping |
| `cook.step` | `session`, `step`, `total` | simplest: re-fetch `/state` (gets the recipe title) |
| `cook.timer` | `endsAt`, `label` | start countdown to `endsAt` |
| `voice.heard` | `utterance` | `Heard: “…”` in the lower-left when nothing is cooking |
| `plan.rerouted` | `day`, `cancelled {title, reason}`, `replacement {recipeId, title} \| null` | **the cancel moment** (§3); keep the cancelled row until the next `plan.updated` with `status: "drafting"` |
| `ping` (event name only) | timestamp | ignore (keep-alive every 15 s) |

**Reconnects:** each stream closes after about 10 minutes (a Lambda limit) and on network blips. Reconnect with `?after=<last seq you applied>` (or the `Last-Event-ID` header) and you'll get everything you missed. Never re-fetch from 0. Expect about 1 s latency (the server checks DynamoDB every second).

### 4.3 Fallback if SSE doesn't work on Vega
Poll `GET /households/patels/state` every 1.5 s and re-render when `lastSeq` changes. The UX is the same, with slightly more latency. Decide on day 1 and note the answer in `FRICTION_LOG.md`.

### 4.4 Buttons: `POST /api/tools/<name>` with a JSON body (`{}` unless noted)
Response: `{ "text": "Step 2 of 5: …", "data": {…}, "isError"?: true }`. Show `text` as a 3-second toast. The board will also update from the event stream.

| Button | Tool | Body |
|---|---|---|
| Start tonight's dinner | `start_cooking` | `{}` (or `{"recipe":"chana masala"}`) |
| ◀ Back | `previous_step` | `{}` |
| Repeat | `repeat_step` | `{}` |
| Next ▶ | `next_step` | `{}` |
| ⏱ Timer | `start_timer` | `{}` (uses the step's time) or `{"minutes":8}` |
| Plan the week | `plan_week` | `{}` |
| Split chores | `assign_chores` | `{}` |
| Shopping list | `shopping_list` | `{}` |

## 5. D-pad behavior

- On launch, focus **Next ▶**.
- Left/Right move between buttons in a row; Up/Down move between the cooking row and the footer row. Use `TVFocusGuideView` or the Vega focus APIs so focus never gets lost.
- **Select/OK** presses the focused button. **Play/Pause** = Next step (a nice touch for flour-covered hands). **Back** on the remote does nothing (there's only one screen); don't exit the app on Back during the demo.
- A focused button gets a 4 px amber outline offset 4 px (BRAND.md focus rule); it must be visible from 3 m.

## 6. Look

Use [`docs/BRAND.md`](BRAND.md) and [`design/tokens.json`](../design/tokens.json): colors `bg #0E0F0C`, `row #1A1B17`, `flap #24251F`, `paper #ECE6D8`, `dim #8E8B80`, `amber #FFB84D` ("now" only), `red #FF4A3D` (safety only), `green #5BD18B`. Fonts are Archivo (500/900) and JetBrains Mono (500/800); bundle them with the app, since a TV may be offline. Sizes: label 24, body 32, row 40, header 64, hero 120. Corners are square (flap tiles 2 px); no shadows or gradients. Focus is a 4 px amber outline offset 4 px. Read the values from `tokens.json` (copy it into `apps/tv` at build time) instead of hard-coding them.

## 7. Done when (acceptance checklist; tick these in PLAN.md M2/M4)

- [ ] App launches on the **Fire TV device** (or the Vega Virtual Device) and shows the Patels' board within 3 s.
- [ ] Say/type in `/sim` "plan dinners this week". The TV shows `PLANNING…`, then the dinners flap in, with no refresh.
- [ ] **The cancel:** "make Friday peanut noodles". The TV shows the struck-through `PEANUT SATAY NOODLES · CANCELLED · ALLERGY` row, the red ticker with the reason, and the rerouted row, all within ~2 s.
- [ ] "split the chores": today's chores appear.
- [ ] "let's cook tonight's dinner", then "next step", then "start the timer": the step text and countdown update within ~2 s, and "Time's up!" plus a chime fire at 0.
- [ ] The D-pad alone can start cooking, go next/back/repeat and start a timer; the focus ring is always visible.
- [ ] Unplug Wi-Fi for 20 s and replug: the app shows "reconnecting…", then catches up with no duplicates.
- [ ] App runs 15+ minutes without crashing (covers at least one stream reconnect).
- [ ] Screen recording or phone video of the above, for the demo video (§8).
- [ ] `apps/tv/README.md`: how to build, run on the Virtual Device and sideload to the Fire TV.
- [ ] Friction log entries for anything that slowed you down.

## 8. What the video needs from the TV (record by Mon Oct 19)

Film the real TV (phone on a tripod is fine), with the laptop running `/sim` out of shot or picture-in-picture:
1. A wide shot of the kitchen with the TV board visible (2–3 s).
2. "Plan dinners this week…" → the dinners flap in. Then "make Friday peanut noodles" → **the cancel moment** (hold the red ticker 2 s).
3. Cooking: "next step" ×2 and "start the timer". Hands busy (flour, a pan); **no remote in hand**.
4. One D-pad press of Next ▶ to show the remote also works.
5. "Who's on dishes tonight?" → answer spoken, chores panel visible.

Full script: `docs/05-demo-video-script.md`.

## 9. If you're stuck

The `/board` page *is* the fallback. If Vega blocks you past **Fri Oct 16**, tell the team the same day. We'll decide whether to submit to the Fire TV track at all or go Alexa+ only (the video can then use `/board` on a TV browser for the visual).
