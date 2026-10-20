# Homebase Kitchen Board (Fire TV, Vega OS)

The family TV screen for Homebase: a "Dinner Departures" board that shows the week's dinners, tonight's cook-along step and timer, who's on dishes, and the allergy "cancel moment", live as people talk to Alexa. Built with React Native for Vega (Vega SDK 0.24, React Native 0.83).

- Spec: [`docs/04-tv-handoff.md`](../../docs/04-tv-handoff.md). Look: [`docs/BRAND.md`](../../docs/BRAND.md) and [`design/tokens.json`](../../design/tokens.json).
- Reference implementation: the browser board at `<ServerUrl>/board` ([`apps/server/src/board-page.ts`](../server/src/board-page.ts)). The two show the same data the same way.
- Runs on the **Vega Virtual Device**. The team's Fire TV runs Fire OS, which can't install Vega apps (see `FRICTION_LOG.md`).

## How it works

1. On launch it loads `GET /households/patels/state` once (retrying every 3 s until the server answers).
2. It then follows `GET /households/patels/events?after=<seq>` (Server-Sent Events). React Native has no `EventSource`, so [`src/api/sse.ts`](src/api/sse.ts) reads the stream through `XMLHttpRequest`, which Vega delivers incrementally. It reconnects with the last applied `seq` when the server ends a stream (every ~10 minutes) or the network drops, and it drops duplicates.
3. Events go through a pure reducer ([`src/logic/model.ts`](src/logic/model.ts)); [`src/logic/board.ts`](src/logic/board.ts) turns the state into rows, the hero name and the cooking panel.
4. D-pad buttons call `POST /api/tools/<name>`, the same tools Alexa uses, and show the spoken reply as a toast. The board itself updates from the event stream.

"Today" is computed in the household's timezone (`America/Chicago`), because the Virtual Device's clock is UTC.

## Remote

| Key | Does |
|---|---|
| Left / Right | Move between buttons (focus starts on NEXT ▶) |
| OK | Press the focused button |
| Play/Pause | Next cooking step (hands-free friendly) |
| Back | Nothing: there's one screen, and the app shouldn't exit mid-demo |

Buttons: START · ◀ BACK · REPEAT · NEXT ▶ · TIMER · PLAN WEEK · SPLIT CHORES · SHOPPING.

## Set up (once)

Install the Vega Developer Tools by following Amazon's guide for your SDK version: <https://developer.amazon.com/docs/vega/0.24/install-vega-sdk.html>. Check with `vega --version`.

```bash
cd apps/tv
npm install
```

## Build and run on the Vega Virtual Device

```bash
npm run build:app
```

```bash
vega virtual-device start
```

```bash
vega run-app build/aarch64-release/homebasetv_aarch64.vpkg com.homebase.kitchenboard.main -d VirtualDevice
```

On an Intel Mac use `build/x86_64-release/homebasetv_x86_64.vpkg`. `npm run build:app` first copies `design/tokens.json` into `src/theme/tokens.json` (`npm run sync-tokens`), so brand changes flow into the app.

To try it end to end, open `<ServerUrl>/sim` in a browser and say or type "plan dinners this week", "make Friday peanut noodles", "let's cook tonight's dinner", "next step", "start the timer". The board on the Virtual Device updates within about a second.

## On a real Vega Fire TV

Vega apps install only on Vega OS devices (for example Fire TV Stick 4K Select) registered for development. Build, then run `vega run-app build/armv7-release/homebasetv_armv7.vpkg com.homebase.kitchenboard.main` with the device connected; see Amazon's [run-apps guide](https://developer.amazon.com/docs/vega/0.24/run-apps.html).

## Checks

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

Tests cover the event reducer (including the cancel moment, duplicates after reconnects and timers), the SSE parser and reconnect logic, the board rows, household-timezone dates, brand tokens and fonts, and an app render with a D-pad press.

## Notes

- Fonts: Archivo (Medium, Black) and JetBrains Mono (Medium, ExtraBold) are bundled in `assets/fonts/` under the SIL Open Font License (license files alongside). Vega loads `assets/fonts/<family>.ttf` by family name.
- No timer chime yet: Vega has no simple sound-effect API (see `FRICTION_LOG.md`). At zero the timer turns red and reads TIME'S UP.
- The server URL and household are in [`src/api/config.ts`](src/api/config.ts). There's no login until account linking (PLAN.md M5).
