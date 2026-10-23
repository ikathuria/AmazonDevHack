// Renders the demo-video visuals (no voiceover, no device footage) to video/out/homebase-visuals.mp4.
// Drives a local Homebase server (npm run dev, memory store) through the script in docs/05-demo-video-script.md,
// records /board with Chrome, renders title/architecture/number cards, and joins them with ffmpeg.
// Needs: Node 20+, ffmpeg, Google Chrome, and `puppeteer-core` (npm i --no-save puppeteer-core).
// Usage: PORT=8799 npm run dev   then   node scripts/video/make-visuals.mjs [http://localhost:8799]
import puppeteer from "puppeteer-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const BASE = process.argv[2] ?? "http://localhost:8799";
const OUT = resolve(root, "video/out");
const TMP = resolve(OUT, "parts");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const T = JSON.parse(readFileSync(resolve(root, "design/tokens.json"), "utf8")).color;
const FONTS = resolve(root, "apps/tv/assets/fonts");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const call = (name, args = {}) =>
  fetch(`${BASE}/api/tools/${name}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(args) }).then((r) => r.json());

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });

// ---------- caption overlay on the live board ----------
const CAPTION_CSS = `
html{background:${T.bg}}
.stage{transform:scale(.8)!important;margin-left:192px}
.toast{display:none!important}
#cap{position:fixed;left:192px;top:884px;width:1536px;z-index:50;font-family:'Archivo',sans-serif;display:flex;flex-direction:column;gap:10px;pointer-events:none}
#cap div{background:rgba(14,15,12,.94);border-left:8px solid ${T.dim};padding:12px 24px;font-size:34px;color:${T.paper};opacity:0;transform:translateY(12px);transition:all .28s cubic-bezier(.2,.8,.2,1)}
#cap div.on{opacity:1;transform:none}
#cap .you{border-color:${T.amber}}
#cap .alexa{border-color:${T.green}}
#cap small{display:block;font-family:'JetBrains Mono',monospace;font-size:20px;letter-spacing:.12em;color:${T.dim};margin-bottom:4px}
`;
async function caption(page, kind, text) {
  await page.evaluate((kind, text) => {
    const cap = document.getElementById("cap");
    const d = document.createElement("div");
    d.className = kind;
    d.innerHTML = `<small>${kind === "you" ? "YOU SAY" : "ALEXA+ (SIMULATED) REPLIES"}</small>${text}`;
    cap.replaceChildren(d);
    requestAnimationFrame(() => d.classList.add("on"));
  }, kind, text);
}
const clearCaption = (page) => page.evaluate(() => document.getElementById("cap").replaceChildren());

async function record(name, seconds, script) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/board`, { waitUntil: "networkidle2" });
  await page.evaluate((css) => {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const c = document.createElement("div"); c.id = "cap"; document.documentElement.appendChild(c);
  }, CAPTION_CSS);
  await sleep(1200);
  const raw = resolve(TMP, `${name}.raw.mp4`);
  const rec = await page.screencast({ path: raw, speed: 1 });
  const t0 = Date.now();
  await script(page, () => (Date.now() - t0) / 1000);
  const left = seconds + 1 - (Date.now() - t0) / 1000;
  if (left > 0) await sleep(left * 1000);
  await rec.stop();
  await page.close();
  // normalise: constant 30 fps, exact duration, 1080p H.264
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-vf", `fps=30,scale=1920:1080,tpad=stop_mode=clone:stop_duration=${seconds}`, "-t", String(seconds), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-an", resolve(TMP, `${name}.mp4`)]);
  console.log("recorded", name, seconds + "s");
}
const until = async (t, now) => { const w = t - now(); if (w > 0) await sleep(w * 1000); };

// ---------- scenes (times from docs/05) ----------
await record("01-board-idle", 12, async () => {});

await record("02-plan", 23, async (page, now) => {
  await caption(page, "you", "“Alexa, ask Homebase to plan dinners this week, something quick on Wednesday.”");
  await until(2, now);
  const r = await call("plan_week", { request: "something quick on Wednesday" });
  await until(5, now);
  await caption(page, "alexa", r.text);
});

await record("03-cancel", 17, async (page, now) => {
  await caption(page, "you", "“Make Friday peanut noodles.”");
  await until(2.5, now);
  const r = await call("set_dinner", { day: "friday", recipe: "peanut noodles" });
  await until(4, now);
  await caption(page, "alexa", r.text);
});

await record("04-chores", 18, async (page, now) => {
  await caption(page, "you", "“Split the chores fairly.”");
  await until(1.5, now);
  const r1 = await call("assign_chores");
  await until(5, now);
  await caption(page, "alexa", r1.text);
  await until(9.5, now);
  await caption(page, "you", "“Who’s on dishes tonight?”");
  await until(11, now);
  const r2 = await call("whos_on", { chore: "dishes", day: "tonight" });
  await until(12.5, now);
  await caption(page, "alexa", r2.text);
});

await record("05-cook", 40, async (page, now) => {
  await caption(page, "you", "“Let’s cook tonight’s dinner.”");
  await until(1.5, now);
  const r = await call("start_cooking");
  await until(4, now);
  await caption(page, "alexa", r.text);
  await until(11, now);
  await caption(page, "you", "“Next step.”");
  await until(12, now);
  const r2 = await call("next_step");
  await until(14, now);
  await caption(page, "alexa", r2.text);
  await until(21, now);
  await caption(page, "you", "“Start the timer.”");
  await until(22, now);
  const r3 = await call("start_timer");
  await until(24, now);
  await caption(page, "alexa", r3.text);
  await until(30, now);
  await clearCaption(page);
  await page.click('button[data-tool="next_step"]'); // the D-pad fallback
});

await record("06-shopping", 15, async (page, now) => {
  await caption(page, "you", "“What do we need to buy?”");
  await until(1.5, now);
  const r = await call("shopping_list");
  await until(4, now);
  await caption(page, "alexa", r.text);
});

// ---------- cards ----------
const fontFace = `
@font-face{font-family:'Archivo';font-weight:900;src:url('file://${FONTS}/Archivo Black.ttf')}
@font-face{font-family:'Archivo';font-weight:500;src:url('file://${FONTS}/Archivo Medium.ttf')}
@font-face{font-family:'JetBrains Mono';font-weight:800;src:url('file://${FONTS}/JetBrains Mono ExtraBold.ttf')}
@font-face{font-family:'JetBrains Mono';font-weight:500;src:url('file://${FONTS}/JetBrains Mono Medium.ttf')}
*{box-sizing:border-box;margin:0}
body{width:1920px;height:1080px;background:${T.bg};color:${T.paper};font-family:'Archivo',sans-serif;padding:64px 88px;overflow:hidden}
.mono{font-family:'JetBrains Mono',monospace}
h1{font-weight:900;font-size:64px;letter-spacing:.01em}
.rule{height:4px;background:${T.amber};margin:24px 0 48px}
.sq{display:inline-block;width:28px;height:28px;background:${T.amber};margin-right:20px}
`;
async function card(name, seconds, html) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setContent(`<style>${fontFace}</style>${html}`);
  await page.evaluateHandle("document.fonts.ready");
  await sleep(400);
  const png = resolve(TMP, `${name}.png`);
  await page.screenshot({ path: png });
  await page.close();
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", png, "-t", String(seconds), "-vf", "fade=in:0:8", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-an", resolve(TMP, `${name}.mp4`)]);
  console.log("card", name, seconds + "s");
}

const box = (x, y, w, h, title, sub, color = T.paper) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${T.row};border-left:8px solid ${color};padding:18px 24px">
     <div style="font-weight:900;font-size:34px">${title}</div><div class="mono" style="font-size:22px;color:${T.dim};margin-top:8px;line-height:1.35">${sub}</div></div>`;
const arrow = (x, y, w, label = "") =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:4px;background:${T.amber}"></div>
   <div style="position:absolute;left:${x + w - 14}px;top:${y - 12}px;border-left:22px solid ${T.amber};border-top:14px solid transparent;border-bottom:14px solid transparent"></div>
   <div class="mono" style="position:absolute;left:${x}px;top:${y - 40}px;width:${w}px;text-align:center;font-size:20px;color:${T.dim}">${label}</div>`;
const varrow = (x, y, h) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:4px;height:${h}px;background:${T.amber}"></div>
   <div style="position:absolute;left:${x - 12}px;top:${y + h - 14}px;border-top:22px solid ${T.amber};border-left:14px solid transparent;border-right:14px solid transparent"></div>`;

await card("07-architecture", 25, `
<h1><span class="sq"></span>HOW IT WORKS</h1><div class="rule"></div>
${box(88, 250, 400, 180, "ALEXA+", "simulated (/sim) · classic skill “home base” on Echo / Fire TV", T.green)}
${arrow(488, 340, 190, "MCP · HTTPS")}
${box(680, 250, 520, 180, "MCP SERVER", "Lambda · 22 tools · never calls a model · ~70 ms", T.amber)}
${arrow(1200, 340, 190, "read / write")}
${box(1392, 250, 440, 180, "DYNAMODB", "household memory · board events", T.paper)}
${varrow(940, 430, 130)}
${box(680, 560, 520, 140, "SQS → WORKER LAMBDA", "queued meal planning", T.paper)}
${varrow(780, 700, 90)}
${box(400, 790, 450, 160, "BEDROCK (CLAUDE)", "proposes dinners", T.paper)}
${arrow(850, 870, 100, "")}
${box(950, 790, 420, 160, "ALLERGEN VERIFIER", "code decides · tested", T.red)}
${varrow(1612, 430, 250)}
${box(1392, 700, 440, 130, "EVENT STREAM (SSE)", "Lambda response streaming", T.amber)}
<div class="mono" style="position:absolute;left:1392px;top:880px;width:440px;font-size:24px;color:${T.paper}">▼ FIRE TV (VEGA) · WEB BOARD</div>
`);

const stat = (big, small, note = "") => `
<h1><span class="sq"></span>HOMEBASE · BY THE NUMBERS</h1><div class="rule"></div>
<div style="margin-top:150px;font-weight:900;font-size:240px;color:${T.amber};line-height:1">${big}</div>
<div style="font-size:56px;margin-top:24px">${small}</div>
<div class="mono" style="font-size:26px;color:${T.dim};margin-top:40px;max-width:1500px;line-height:1.4">${note}</div>`;
await card("08-stat-latency", 5, stat("p95 105 ms", "200 live calls · Alexa+ budget: 500 ms", "10 tools, 20 calls each, from a laptop in Chicago to AWS us-east-1 · eval/latency.md"));
await card("09-stat-eval", 5, stat("37 / 40", "requests routed to the right tool", "Claude Haiku 4.5 as the client · request set written by an AI agent, so read it as optimistic · eval/RESULTS.md"));
await card("10-stat-tests", 5, stat("87 tests", "allergen checks, chore fairness, full demo journey", "Allergy verification is deterministic code with 30 test cases, not the model’s opinion"));

await browser.close();

// ---------- join ----------
const order = ["01-board-idle", "02-plan", "03-cancel", "04-chores", "05-cook", "06-shopping", "07-architecture", "08-stat-latency", "09-stat-eval", "10-stat-tests"];
writeFileSync(resolve(TMP, "list.txt"), order.map((n) => `file '${n}.mp4'`).join("\n"));
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", resolve(TMP, "list.txt"), "-c", "copy", resolve(OUT, "homebase-visuals.mp4")]);
console.log("done:", resolve(OUT, "homebase-visuals.mp4"));
