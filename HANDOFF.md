# Handoff: 2026-10-22 · Homebase submission, what's left (for Yasaa)

**Goal:** submit Homebase to Amazon's *Build, Ship, Shape* hackathon (Alexa+ and Fire TV tracks, AWS Builder mini-challenge).
**Status:** code, docs and media are done and pushed. Still needed: the narrated video, a Vega Virtual Device screenshot, and the human-written Devpost text. Our target is **today (Thu 10-22) 18:00 CT**; hard deadline **Fri 10-23 12:00 PT (14:00 CT)**.

## Next step
Run the Vega acceptance run on the Virtual Device (`docs/04-tv-handoff.md` §7) while filming → verify by ticking each box there and saving a screenshot of the board on the Virtual Device.

## To do before submitting
- [ ] **Vega Virtual Device screenshot(s)** of the board, ideally the cancel moment, for the Fire TV track. Every image in `docs/media/` is the web `/board`, not the Vega app. Add it to the Devpost gallery and the README Screenshots section.
- [ ] **Film device footage** per `docs/05-demo-video-script.md`: the Vega Virtual Device, the kitchen, and "Alexa, ask home base …" on a real Echo/Fire TV. Overlay on `docs/media/homebase-board-visuals.mp4` (silent, 2:45) and end with `docs/media/end-card-5s.mp4`.
- [ ] **Voiceover**, using the narration column in `docs/05`. Say accurately: "built as an Alexa+ add-on; on Alexa today through a skill". Never imply the Alexa+ add-on is live.
- [ ] **Upload the video** to YouTube/Vimeo (public, under 3:00, no copyrighted music). Paste the link in `SUBMISSION.md` (`Video` line) and at the top of `README.md`.
- [ ] **Reseed the demo household before filming** (the latency run mutated live data): `TABLE_NAME=<TableName> npm run seed`; then hit `<ServerUrl>/health`.
- [ ] **Edit `SUBMISSION.md` into your own words**: "What we learned", the Vega Product Feedback block (add setup time), and every `DRAFT, edit` "Build again?" line.
- [ ] **Fresh-clone test**: follow only the README "Run locally" steps on a clean checkout.
- [ ] **Devpost form**: select the Alexa+ and Fire TV tracks and the AWS Builder mini-challenge; upload the gallery images and `docs/media/thumbnail-1500x1000.png`; paste `FRICTION_LOG.md`; submit; keep the confirmation email.

## Done this session
- `SUBMISSION.md` updated for the Vega app, stale lines fixed (d368661)
- Latency re-measured live: 200 calls, p50 71 ms, p95 105 ms; cited numbers updated (10ee3b2)
- Video visuals generator and 2:45 silent walkthrough (08920ee); stills, thumbnail and end-card generator (ff3eb55)
- Media committed to `docs/media/`, linked from README and `SUBMISSION.md` (21cca44)

## Decisions
- Fire TV track is shown on the Vega Virtual Device: our Toshiba runs Fire OS 8.1.8.0 and can't install Vega apps (see `FRICTION_LOG.md`).
- Alexa+ path is the live MCP server plus simulated Alexa+ (`/sim`), plus a classic skill for real hardware: MCP Preview access is waitlisted.
- Real Alexa+ deploy and account linking stay out of scope: they depend on access we don't have.

## Gotchas
- The cancel reply on a fresh plan is "Friday stays chana masala" (not garlic spinach pasta); `docs/05` now matches. Narrate what the board actually shows.
- The timer has no chime (no Vega sound API); at zero it turns red and reads TIME'S UP.
- I did not re-run the 33 TV tests (`apps/tv` had no `node_modules`). Run `npm --prefix apps/tv test` before claiming "33 tests".
- To re-render media: `PORT=8799 npm run dev`, then `node scripts/video/make-visuals.mjs` / `make-stills.mjs` (needs `puppeteer-core`, Chrome, ffmpeg).

## Read first
- `docs/05-demo-video-script.md`: timed narration and shot list
- `docs/04-tv-handoff.md`: Vega app spec and the §7 acceptance checklist
- `SUBMISSION.md`: Devpost fields, Product Feedback, media list
- `README.md`: what the repo claims (keep it true)
- `HACKATHON_PLAN.md`: scope, rubric and dates

## Uncommitted
clean (before this file)
