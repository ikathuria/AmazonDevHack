// Renders Devpost gallery screenshots, a 3:2 thumbnail and the video end card to video/out/stills/.
// Same setup as make-visuals.mjs: local server (PORT=8799 npm run dev), puppeteer-core, Chrome, ffmpeg.
// Usage: node scripts/video/make-stills.mjs [http://localhost:8799]
import puppeteer from "puppeteer-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.argv[2] ?? "http://localhost:8799";
const OUT = resolve(root, "video/out/stills");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const T = JSON.parse(readFileSync(resolve(root, "design/tokens.json"), "utf8")).color;
const FONTS = resolve(root, "apps/tv/assets/fonts");
const REPO = "github.com/ikathuria/AmazonDevHack";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });
const call = (name, args = {}) =>
  fetch(`${BASE}/api/tools/${name}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(args) }).then((r) => r.json());

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });

// ---- live board screenshots ----
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
await page.goto(`${BASE}/board`, { waitUntil: "networkidle2" });
await sleep(1500);
const shot = async (name, wait = 2500) => { await sleep(wait); await page.screenshot({ path: resolve(OUT, name) }); console.log(name); };

await call("plan_week", { request: "something quick on Wednesday" });
await shot("01-week-plan.png", 3500);
await call("set_dinner", { day: "friday", recipe: "peanut noodles" });
await shot("02-cancel-allergy.png", 3000);
await call("assign_chores");
await call("whos_on", { chore: "dishes", day: "tonight" });
await shot("03-chores-dishes.png", 3000);
await call("start_cooking");
await call("next_step");
await call("start_timer");
await shot("04-cook-along-timer.png", 3000);
await page.close();

// ---- cards ----
const fontFace = `
@font-face{font-family:'Archivo';font-weight:900;src:url('file://${FONTS}/Archivo Black.ttf')}
@font-face{font-family:'Archivo';font-weight:500;src:url('file://${FONTS}/Archivo Medium.ttf')}
@font-face{font-family:'JetBrains Mono';font-weight:800;src:url('file://${FONTS}/JetBrains Mono ExtraBold.ttf')}
@font-face{font-family:'JetBrains Mono';font-weight:500;src:url('file://${FONTS}/JetBrains Mono Medium.ttf')}
*{box-sizing:border-box;margin:0}
body{background:${T.bg};color:${T.paper};font-family:'Archivo',sans-serif;overflow:hidden;position:relative}
.mono{font-family:'JetBrains Mono',monospace}
`;
async function card(file, w, h, html) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h });
  await p.setContent(`<style>${fontFace} body{width:${w}px;height:${h}px;padding:${h * 0.06}px ${w * 0.046}px}</style>${html}`);
  await p.evaluateHandle("document.fonts.ready");
  await sleep(400);
  await p.screenshot({ path: resolve(OUT, file) });
  await p.close();
  console.log(file);
}

// a single departure-board row, reused on the end card and thumbnail
const row = (day, dinner, status, color, bg = T.row, fg = T.paper, strike = false, fs = 44) =>
  `<div class="mono" style="display:flex;background:${bg};color:${fg};font-weight:800;font-size:${fs}px;padding:20px 28px;margin-bottom:12px">
     <div style="width:150px">${day}</div><div style="flex:1;${strike ? `text-decoration:line-through;text-decoration-color:${T.red};color:${T.dim}` : ""}">${dinner}</div><div style="color:${color}">${status}</div></div>`;

const endCard = (w, h) => `
<div style="font-weight:900;font-size:${w * 0.085}px;letter-spacing:.01em;margin-top:${h * 0.03}px"><span style="display:inline-block;width:${w * 0.02}px;height:${w * 0.02}px;background:${T.amber};margin-right:${w * 0.014}px"></span>HOMEBASE</div>
<div style="height:4px;background:${T.amber};margin:${h * 0.03}px 0 ${h * 0.04}px"></div>
<div style="font-size:${w * 0.027}px;line-height:1.3;max-width:${w * 0.8}px">Your family's memory, on the screen you already have.</div>
<div style="margin-top:${h * 0.05}px;transform-origin:0 0;width:${w * 0.82}px;font-size:${w * 0.012}px">
  ${row("FRI", "PEANUT SATAY NOODLES", "CANCELLED · ALLERGY", T.red, T.row, T.dim, true, w * 0.0229)}
  ${row("FRI", "CHANA MASALA", "REROUTED", T.paper, T.row, T.paper, false, w * 0.0229)}
  ${row("SAT", "GARLIC SPINACH PASTA", "ON TIME", T.green, T.row, T.paper, false, w * 0.0229)}
</div>
<div class="mono" style="position:absolute;left:${w * 0.046}px;bottom:${h * 0.07}px;font-size:${w * 0.0155}px;line-height:1.6;color:${T.dim}">
  <span style="color:${T.paper}">${REPO}</span> · MIT license<br>
  Built as an Alexa+ MCP add-on · Fire TV (Vega) · AWS Lambda, DynamoDB, SQS, Bedrock
</div>`;
await card("end-card-1920x1080.png", 1920, 1080, endCard(1920, 1080));
await card("thumbnail-1500x1000.png", 1500, 1000, endCard(1500, 1000));

// architecture + numbers stills (gallery)
const box = (x, y, w, h, title, sub, color = T.paper) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${T.row};border-left:8px solid ${color};padding:18px 24px"><div style="font-weight:900;font-size:34px">${title}</div><div class="mono" style="font-size:22px;color:${T.dim};margin-top:8px;line-height:1.35">${sub}</div></div>`;
const arrow = (x, y, w, label = "") =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:4px;background:${T.amber}"></div><div style="position:absolute;left:${x + w - 14}px;top:${y - 12}px;border-left:22px solid ${T.amber};border-top:14px solid transparent;border-bottom:14px solid transparent"></div><div class="mono" style="position:absolute;left:${x}px;top:${y - 40}px;width:${w}px;text-align:center;font-size:20px;color:${T.dim}">${label}</div>`;
const varrow = (x, y, h) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:4px;height:${h}px;background:${T.amber}"></div><div style="position:absolute;left:${x - 12}px;top:${y + h - 14}px;border-top:22px solid ${T.amber};border-left:14px solid transparent;border-right:14px solid transparent"></div>`;
await card("05-architecture.png", 1920, 1080, `
<h1 style="font-weight:900;font-size:64px"><span style="display:inline-block;width:28px;height:28px;background:${T.amber};margin-right:20px"></span>HOW IT WORKS</h1><div style="height:4px;background:${T.amber};margin:24px 0 48px"></div>
${box(88, 250, 400, 180, "ALEXA+", "simulated (/sim) · classic skill “home base” on Echo / Fire TV", T.green)}
${arrow(488, 340, 190, "MCP · HTTPS")}
${box(680, 250, 520, 180, "MCP SERVER", "Lambda · 22 tools · never calls a model · ~70 ms", T.amber)}
${arrow(1200, 340, 190, "read / write")}
${box(1392, 250, 440, 180, "DYNAMODB", "household memory · board events", T.paper)}
${varrow(780, 430, 130)}
${box(680, 560, 520, 140, "SQS → WORKER LAMBDA", "queued meal planning", T.paper)}
${varrow(780, 700, 90)}
${box(400, 790, 450, 160, "BEDROCK (CLAUDE)", "proposes dinners", T.paper)}
${arrow(850, 870, 100, "")}
${box(950, 790, 420, 160, "ALLERGEN VERIFIER", "code decides · tested", T.red)}
${varrow(1612, 430, 250)}
${box(1392, 700, 440, 130, "EVENT STREAM (SSE)", "Lambda response streaming", T.amber)}
<div class="mono" style="position:absolute;left:1392px;top:880px;width:440px;font-size:24px">▼ FIRE TV (VEGA) · WEB BOARD</div>`);

await browser.close();
// 5 s end-card clip for the end of the video
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", resolve(OUT, "end-card-1920x1080.png"), "-t", "5", "-vf", "fade=in:0:10,fade=out:st=4.5:d=0.5", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", resolve(OUT, "end-card-5s.mp4")]);
console.log("end-card-5s.mp4");
