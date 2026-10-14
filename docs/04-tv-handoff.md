# 04 — Fire TV (Vega) app hand-off spec

**Owner:** Builder 2 · **Folder:** `apps/tv/` (yours alone; don't edit `apps/server`, `infra`, `packages/contracts` without agreeing first) · **Written:** 2026-10-13 · **Feature freeze:** Mon Oct 19, 22:00 CT · **Submit:** Thu Oct 22, 18:00 CT

## 1. Why this matters (read first)

Our Fire TV track entry is only valid if the **demo video shows the app running on a real Fire TV or the Vega Virtual Device** (rules §4). The backend is done and live; the TV app is the last thing on the critical path. Keep it **small, reliable and good-looking at 10 feet**: one screen, four panels, live updates, D-pad controls. No accounts, no settings and no navigation stack are needed.

**Reference implementation:** `apps/server/src/board-page.ts`, live at `<ServerUrl>/board`. It's a web version of exactly this app with the same data flow, panels and buttons. Open it on a laptop next to `<ServerUrl>/sim` and say things. Port its behavior to React Native for Vega; you don't need to invent any of it.

`<ServerUrl>` = `https://koothznswwvs4koyux64x4bs3e0msbsb.lambda-url.us-east-1.on.aws` (no auth; household `patels`).

## 2. Setup (fetch current docs; don't trust memory)

1. Install the Vega SDK + Vega Virtual Device by following Amazon's current getting-started guide: <https://developer.amazon.com/docs/vega/latest/vega-rn-overview.html>. React Native for Vega supports RN 0.72 / 0.83.
2. Check which OS your Fire TV runs (Settings → My Fire TV → About). Vega runs on newer sticks (e.g. Fire TV Stick 4K Select); a Fire OS (Android) device can't run a Vega app. In that case, record the demo on the Vega Virtual Device, which the rules accept.
3. Register the Fire TV as a developer device (sideloading works only on registered devices, via USB/CLI).
4. Scaffold the app **inside `apps/tv/`** with Vega's template. Keep its own `package.json`; the root `package.json` doesn't need changes until you want `npm run lint` to include it.
5. Log anything confusing or broken in `FRICTION_LOG.md` as you go (task, steps, expected vs actual, severity, workaround, suggestion). It's worth up to **+10%** of our score.

**Open question to answer early (day 1):** does Vega's RN networking support **`EventSource`/SSE or streaming `fetch`**? If not, use the long-poll fallback in §4.3. It's already supported by the server, so it costs nothing to switch.

## 3. The screen

One full-screen view, 1920×1080, dark background, readable from the sofa (body text ≥ 28 px, step text ≥ 56 px). Layout mirrors `/board`:

| Panel | Shows | Data |
|---|---|---|
| **Now cooking** (left, tallest) | recipe title, "step N of M", progress bar, the step text (big), a countdown timer, the 5 cooking buttons | `state.cook` + `cook.step` / `cook.timer` events |
| **This week** (top right) | 7 days, tonight highlighted, plus up to 2 "⛔ Skipped X · reason" lines (**this is our demo's safety moment, so make it visible**) | `state.plan` + `plan.updated` |
| **Chores today** (right) | `Name · chore` for today, ✓ when done | `state.choreAssignments` filtered to today + `state.chores` for names + `chores.updated` |
| **Shopping** (right) | unchecked items, max ~8 | `state.shopping` + `shopping.updated` |
| **Footer** | `Alexa heard: "…"` (latest utterance), plus 3 buttons: Plan the week · Split chores · Shopping list | `voice.heard` events |
| **Header** | "Homebase", household name, clock, connection dot (● live / reconnecting…) | |

States to handle:
- **Plan drafting:** "Drafting… checking everyone's allergies".
- **No plan / no rota / nothing cooking:** muted hint text, e.g. *Say "Alexa, ask Homebase to start cooking tonight's dinner", or press Start*.
- **Stale plan** (`plan.weekOf` ≠ this week's Monday): show "Last week's plan".
- **Timer at 0:** "Time's up!" plus a short chime.
- **Offline:** a "reconnecting…" banner; keep the last good data on screen.

Today's weekday key is `["mon","tue","wed","thu","fri","sat","sun"][(new Date().getDay() + 6) % 7]`. The household timezone is `state.household.timezone` (America/Chicago); the device clock is fine for the demo.

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
| `plan.updated` | `plan` | replace plan |
| `chores.updated` | `assignments` | replace choreAssignments |
| `household.updated` | `household` | replace household |
| `shopping.updated` | `items` | replace shopping |
| `cook.step` | `session`, `step`, `total` | simplest: re-fetch `/state` (gets the recipe title) |
| `cook.timer` | `endsAt`, `label` | start countdown to `endsAt` |
| `voice.heard` | `utterance` | footer "Alexa heard: …" |
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
- A focused button gets a thick, high-contrast ring (we use `#ffd479`); it must be visible from 3 m.

## 6. Look

Until `BRAND.md` exists, copy `/board`'s tokens: background `#101513`, panels `#18201d`, text `#eef2ef`, muted `#9fb0a8`, accent `#4fbf94`, warning `#f08b6c`, focus `#ffd479`, rounded 16 px panels. When the brand step lands, swap the tokens; the layout stays the same.

## 7. Done when (acceptance checklist; tick these in PLAN.md M2/M4)

- [ ] App launches on the **Fire TV device** (or the Vega Virtual Device) and shows the Patels' board within 3 s.
- [ ] Say/type in `/sim` "plan dinners this week". The TV shows "Drafting…" and then the 7 dinners plus the ⛔ peanut line, with no refresh.
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
2. "Plan dinners this week…" → the board fills in, and the ⛔ peanut line is visible (hold it 2 s).
3. Cooking: "next step" ×2 and "start the timer". Hands busy (flour, a pan); **no remote in hand**.
4. One D-pad press of Next ▶ to show the remote also works.
5. "Who's on dishes tonight?" → answer spoken, chores panel visible.

Full script: `docs/05-demo-video-script.md`.

## 9. If you're stuck

The `/board` page *is* the fallback. If Vega blocks you past **Fri Oct 16**, tell the team the same day. We'll decide whether to submit to the Fire TV track at all or go Alexa+ only (the video can then use `/board` on a TV browser for the visual).
