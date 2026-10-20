// Backstop family board (served at /board) in the "Dinner Departures" brand (docs/BRAND.md, design/tokens.json).
// A 1920×1080 canvas scaled to any screen. It is NOT the Fire TV submission (that's apps/tv on Vega); it keeps the demo
// safe if the Vega app slips, and it is the reference the Vega app ports: same data flow, same rows, same cancel moment.
// Data: GET /households/:id/state once, then the SSE feed; buttons call POST /api/tools/:name.
// D-pad: arrow keys move focus between buttons, Enter/OK activates.
// Colors, sizes and motion below mirror design/tokens.json; update both together.
export const BOARD_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Homebase · Dinner Departures</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;800&family=Archivo:wght@500;900&display=swap" rel="stylesheet">
<style>
:root { --bg:#0E0F0C; --row:#1A1B17; --flap:#24251F; --paper:#ECE6D8; --dim:#8E8B80; --amber:#FFB84D; --red:#FF4A3D; --green:#5BD18B; --on:#0E0F0C;
        --ease:cubic-bezier(.2,.8,.2,1); --slide:280ms; }
html, body { margin:0; height:100%; background:var(--bg); overflow:hidden; }
.stage { width:1920px; height:1080px; transform-origin:0 0; background:var(--bg); color:var(--paper); font-family:Archivo, system-ui, sans-serif;
         padding:64px 88px 114px; box-sizing:border-box; position:relative; overflow:hidden; display:flex; flex-direction:column; }
.top { display:flex; align-items:baseline; gap:32px; border-bottom:4px solid var(--amber); padding-bottom:20px; }
.top h1 { font-weight:900; font-size:64px; margin:0; letter-spacing:2px; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.top h1::before { content:""; display:inline-block; width:28px; height:28px; background:var(--amber); margin-right:20px; vertical-align:middle; }
.live { font:500 24px 'JetBrains Mono', monospace; color:var(--dim); letter-spacing:3px; }
.live.off { color:var(--amber); }
.clock { font:800 64px 'JetBrains Mono', monospace; color:var(--amber); }
.heads, .r { display:grid; grid-template-columns:160px 1fr 600px; font-family:'JetBrains Mono', monospace; }
.heads { font-size:24px; color:var(--dim); letter-spacing:4px; margin:24px 0 0; padding:0 24px; }
.board { margin-top:10px; display:flex; flex-direction:column; gap:10px; }
.r { background:var(--row); font-size:40px; padding:14px 24px; transition:background var(--slide) var(--ease), color var(--slide) var(--ease); }
.r > div { white-space:nowrap; overflow:hidden; text-overflow:clip; }
.r.now { background:var(--amber); color:var(--on); font-weight:800; }
.r.cancelled { color:var(--dim); } .r.cancelled .st { color:var(--red); font-weight:800; }
.r.cancelled .din { text-decoration:line-through 4px var(--red); }
.r.past { color:var(--dim); }
.ok { color:var(--green); } .r.now .ok { color:var(--on); }
.slot { overflow:hidden; max-height:0; transition:max-height var(--slide) var(--ease); }
.slot.open { max-height:120px; }
.ch { display:inline-block; min-width:.6em; text-align:center; }
.ch.flip { animation:flip 70ms linear; }
@keyframes flip { 0%{transform:scaleY(1)} 50%{transform:scaleY(0); background:var(--flap)} 100%{transform:scaleY(1)} }
.lower { margin-top:auto; padding-top:24px; display:flex; gap:48px; align-items:flex-end; }
.cook { flex:1; min-width:0; }
.label { font:500 24px 'JetBrains Mono', monospace; color:var(--dim); letter-spacing:4px; }
.step { font:500 40px/1.25 Archivo, sans-serif; margin:10px 0 0; max-height:3.75em; overflow:hidden; }
.timer { font:800 64px 'JetBrains Mono', monospace; color:var(--amber); margin-top:6px; min-height:1em; }
.timer.done { color:var(--red); }
.heard { font-size:32px; color:var(--dim); } .heard b { color:var(--paper); font-weight:500; }
.hero { text-align:right; flex:none; max-width:760px; }
.hero .who { font-size:120px; font-weight:900; line-height:1; color:var(--amber); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.shop { font:500 24px 'JetBrains Mono', monospace; color:var(--dim); letter-spacing:2px; margin-top:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.shop b { color:var(--paper); font-weight:500; }
.controls { margin-top:24px; display:flex; gap:16px; align-items:center; }
.controls button { font:800 24px 'JetBrains Mono', monospace; letter-spacing:2px; color:var(--paper); background:var(--flap); border:0; border-radius:2px; padding:10px 18px; cursor:pointer; }
.controls button:focus { outline:4px solid var(--amber); outline-offset:4px; background:var(--row); }
.controls .sep { flex:1; }
.ticker { position:absolute; left:0; right:0; bottom:0; height:90px; background:var(--red); color:var(--on); font:800 36px 'JetBrains Mono', monospace;
          transform:translateY(100%); transition:transform var(--slide) var(--ease); overflow:hidden; white-space:nowrap; }
.ticker.on { transform:none; }
.ticker span { position:absolute; top:24px; left:100%; }
.ticker.on span { animation:scroll var(--dur, 16s) linear forwards; }
@keyframes scroll { to { transform:translateX(calc(-100% - 2000px)); } }
.toast { position:absolute; left:88px; right:88px; bottom:180px; background:var(--row); color:var(--paper); font:500 32px Archivo, sans-serif; padding:16px 24px; opacity:0; transition:opacity .2s; pointer-events:none; }
.toast.on { opacity:1; }
@media (prefers-reduced-motion: reduce) { *, *::before { animation:none !important; transition:none !important; } }
</style>
</head>
<body>
<div class="stage" id="stage">
  <div class="top"><h1 id="title">HOMEBASE · DINNER DEPARTURES</h1><span class="clock" id="clock"></span></div>
  <div class="heads"><div>DAY</div><div>DINNER</div><div>STATUS</div></div>
  <div class="board" id="board"></div>
  <div class="lower">
    <div class="cook" id="cook"><div class="heard" id="heard">Say <b>“Alexa, ask Homebase to plan dinners this week.”</b></div></div>
    <div class="hero" id="hero"></div>
  </div>
  <div class="controls" role="toolbar" aria-label="Board controls">
    <button data-tool="start_cooking">START</button>
    <button data-tool="previous_step">◀ BACK</button>
    <button data-tool="repeat_step">REPEAT</button>
    <button data-tool="next_step">NEXT ▶</button>
    <button data-tool="start_timer">TIMER</button>
    <span class="sep"></span>
    <button data-tool="plan_week">PLAN WEEK</button>
    <button data-tool="assign_chores">SPLIT CHORES</button>
    <button data-tool="shopping_list">SHOPPING</button>
    <span class="live" id="live">CONNECTING</span>
  </div>
  <div class="toast" id="toast" role="status"></div>
  <div class="ticker" id="ticker"><span id="tickerText"></span></div>
</div>
<script>
const HH = new URLSearchParams(location.search).get("household") || "patels";
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const up = (s) => String(s).toUpperCase();
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const todayIdx = () => (new Date().getDay() + 6) % 7;
let state = null, cursor = 0, es = null, timerEnd = null, tickerTimer = null;
const cancellations = {}; // day -> { title, reason } shown as a CANCELLED row above that day's (rerouted) dinner

function fit() { const k = Math.min(innerWidth / 1920, innerHeight / 1080); $("stage").style.transform = "scale(" + k + ")"; }
addEventListener("resize", fit); fit();

// Split-flap: characters flip in sequence to the new value (flapMs 70, stagger 25).
async function flap(el, text) {
  if (!el || el.dataset.v === text) return;
  el.dataset.v = text;
  if (reduce) { el.textContent = text; return; }
  const len = Math.max(text.length, el.textContent.length);
  el.innerHTML = [...el.textContent.padEnd(len)].map((c) => '<span class="ch">' + (c === " " ? "&nbsp;" : esc(c)) + "</span>").join("");
  await Promise.all([...el.children].map((c, i) => new Promise(async (res) => {
    await wait(i * 25); c.classList.add("flip");
    setTimeout(() => { c.innerHTML = text[i] && text[i] !== " " ? esc(text[i]) : "&nbsp;"; }, 35);
    setTimeout(res, 70);
  })));
}

function ticker(text) {
  $("tickerText").textContent = text;
  $("ticker").style.setProperty("--dur", Math.max(8, (text.length * 22 + 2000) / 120) + "s"); // tickerPxPerSec 120
  $("ticker").classList.remove("on"); void $("ticker").offsetWidth; $("ticker").classList.add("on");
  clearTimeout(tickerTimer); tickerTimer = setTimeout(() => $("ticker").classList.remove("on"), 20000);
}
function toast(text) { $("toast").textContent = text; $("toast").classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => $("toast").classList.remove("on"), 3500); }

function rowStatus(day, i) {
  const p = state.plan, t = todayIdx();
  if (!p || p.status !== "ready") return { cls: "", st: p && p.status === "drafting" ? "PLANNING…" : "—" };
  if (cancellations[day]) return { cls: i === t ? "now" : "", st: "REROUTED" };
  if (i === t) {
    const c = state.cook;
    if (c && c.recipe && p.days[day] && c.recipe.title === p.days[day].title) return { cls: "now", st: "NOW COOKING · STEP " + (c.session.stepIndex + 1) + "/" + c.recipe.steps.length };
    return { cls: "now", st: "BOARDING TONIGHT" };
  }
  return { cls: "", st: '<span class="ok">ON TIME</span>', html: true };
}

function renderBoard() {
  const p = state.plan, t = todayIdx(), week = mondayOf(new Date());
  const stale = p && p.status === "ready" && p.weekOf !== week;
  // Each entry is one on-screen row: a cancelled row (static) or a day row (values flap in).
  const entries = [];
  for (let i = t; i < 7; i++) {
    const day = DAYS[i];
    if (cancellations[day]) entries.push({ rowDay: day, html: '<div class="r cancelled"><div>' + up(day) + '</div><div class="din">' + esc(up(cancellations[day].title)) + '</div><div class="st">CANCELLED · ALLERGY</div></div>' });
    const din = stale ? "LAST WEEK'S PLAN" : (p && p.days && p.days[day] ? up(p.days[day].title) : (p && p.status === "drafting" ? "" : "OPEN"));
    const s = stale ? { cls: "past", st: "ASK FOR A NEW PLAN" } : rowStatus(day, i);
    entries.push({ rowDay: day, day, din, st: s.st, stHtml: !!s.html, html: '<div class="r ' + s.cls + '"><div>' + up(day) + '</div><div class="din" data-k="din-' + day + '"></div><div class="st" data-k="st-' + day + '"></div></div>' });
  }
  // Max 5 rows (cancelled rows included) so the board never runs under the controls or the ticker. Tonight's row and
  // every cancelled + rerouted pair stay; the furthest-out ordinary days go first (same as fitRows in the TV app).
  const keep = (e) => e.rowDay === DAYS[t] || !!cancellations[e.rowDay];
  for (let i = entries.length - 1; i >= 0 && entries.length > 5; i--) if (!keep(entries[i])) entries.splice(i, 1);
  const shown = entries.slice(0, 5);
  $("board").innerHTML = shown.map((e) => e.html).join("");
  for (const r of shown.filter((e) => e.day)) {
    const dinEl = document.querySelector('[data-k="din-' + r.day + '"]'), stEl = document.querySelector('[data-k="st-' + r.day + '"]');
    const prevDin = renderBoard.prev[r.day + "d"] || "", prevSt = renderBoard.prev[r.day + "s"] || "";
    dinEl.textContent = prevDin; dinEl.dataset.v = prevDin; flap(dinEl, r.din);
    if (r.stHtml) stEl.innerHTML = r.st; else { stEl.textContent = prevSt; stEl.dataset.v = prevSt; flap(stEl, r.st); }
    renderBoard.prev[r.day + "d"] = r.din; renderBoard.prev[r.day + "s"] = r.stHtml ? "" : r.st;
  }
}
renderBoard.prev = {};

function mondayOf(d) { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() - todayIdx())); return x.toISOString().slice(0, 10); }

function renderLower() {
  const names = Object.fromEntries(state.household.members.map((m) => [m.id, m.name]));
  const c = state.cook;
  if (c && c.recipe) {
    $("cook").innerHTML = '<div class="label">NOW COOKING · ' + esc(up(c.recipe.title)) + " · STEP " + (c.session.stepIndex + 1) + "/" + c.recipe.steps.length + '</div><div class="step">' + esc(c.recipe.steps[c.session.stepIndex].text) + '</div><div class="timer" id="timer"></div>';
  }
  const today = DAYS[todayIdx()];
  const dishes = (state.choreAssignments || []).find((a) => a.day === today && a.choreId === "dishes");
  const open = (state.shopping || []).filter((i) => !i.checked);
  $("hero").innerHTML = (dishes ? '<div class="label">DISHES · GATE SINK' + (dishes.done ? " · DONE" : "") + '</div><div class="who">' + esc(up(names[dishes.memberId] || dishes.memberId)) + "</div>" : "")
    + (open.length ? '<div class="shop">SHOPPING · <b>' + esc(up(open.slice(0, 4).map((i) => i.name).join(" · "))) + "</b>" + (open.length > 4 ? " +" + (open.length - 4) : "") + "</div>" : "");
}

function render() { if (!state) return; $("title").textContent = up(state.household.name) + " · DINNER DEPARTURES"; renderBoard(); renderLower(); }

async function cancelMoment(ev) {
  // Signature move 2 (BRAND.md): row dims → status flips red → ticker explains → safe dinner slides in lit amber.
  cancellations[ev.day] = ev.cancelled;
  render();
  const who = (ev.cancelled.reason.match(/and (\\w+) is allergic/) || [])[1];
  ticker("⚠ " + up(ev.cancelled.title) + " CANCELLED" + (who ? " · " + up(who) + " HAS AN ALLERGY" : "") + (ev.replacement ? " → REROUTED TO " + up(ev.replacement.title) : " · NO SAFE SWAP FOUND"));
}

function apply(e) {
  cursor = Math.max(cursor, e.seq);
  const ev = e.event;
  if (ev.type === "plan.updated") {
    if (ev.plan.status === "drafting") for (const k of Object.keys(cancellations)) delete cancellations[k];
    const fresh = state.plan && state.plan.status === "drafting" && ev.plan.status === "ready";
    state.plan = ev.plan;
    if (fresh && ev.plan.blocked.length) ticker("⚠ " + ev.plan.blocked.map((b) => "SKIPPED " + up(b.title) + " · " + up(b.reason)).join("   ·   "));
  }
  else if (ev.type === "plan.rerouted") { cancelMoment(ev); return; }
  else if (ev.type === "chores.updated") state.choreAssignments = ev.assignments;
  else if (ev.type === "household.updated") state.household = ev.household;
  else if (ev.type === "shopping.updated") state.shopping = ev.items;
  else if (ev.type === "cook.step") { load(); return; }
  else if (ev.type === "cook.timer") { timerEnd = new Date(ev.endsAt).getTime(); }
  else if (ev.type === "voice.heard") { if (!state.cook) $("cook").innerHTML = '<div class="heard">Heard: <b>“' + esc(ev.utterance) + '”</b></div>'; return; }
  render();
}

function connect() {
  if (es) es.close();
  es = new EventSource("/households/" + encodeURIComponent(HH) + "/events?after=" + cursor);
  es.onopen = () => { $("live").textContent = "● LIVE"; $("live").classList.remove("off"); };
  es.onerror = () => { $("live").textContent = "RECONNECTING"; $("live").classList.add("off"); };
  ["plan.updated","plan.rerouted","chores.updated","household.updated","shopping.updated","cook.step","cook.timer","voice.heard"]
    .forEach((t) => es.addEventListener(t, (m) => apply(JSON.parse(m.data))));
}

async function load() {
  const r = await fetch("/households/" + encodeURIComponent(HH) + "/state");
  if (!r.ok) { $("live").textContent = "HOUSEHOLD NOT FOUND"; $("live").classList.add("off"); return; }
  state = await r.json();
  const ends = state.cook && state.cook.session && state.cook.session.timerEndsAt ? new Date(state.cook.session.timerEndsAt).getTime() : 0;
  if (ends > Date.now()) timerEnd = ends;
  if (!es) { cursor = state.lastSeq; connect(); }
  render();
}

document.querySelectorAll("button[data-tool]").forEach((b) => b.addEventListener("click", async () => {
  const r = await fetch("/api/tools/" + b.dataset.tool, { method:"POST", headers:{ "content-type":"application/json" }, body:"{}" });
  const j = await r.json().catch(() => ({}));
  if (j.text) toast(j.text);
}));
document.addEventListener("keydown", (e) => {
  const btns = [...document.querySelectorAll(".controls button")];
  const i = btns.indexOf(document.activeElement);
  if (["ArrowRight","ArrowDown"].includes(e.key)) { btns[(i + 1) % btns.length].focus(); e.preventDefault(); }
  if (["ArrowLeft","ArrowUp"].includes(e.key)) { btns[(i - 1 + btns.length) % btns.length].focus(); e.preventDefault(); }
});

setInterval(() => {
  const d = new Date();
  $("clock").textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + " " + up(DAYS[todayIdx()]);
  const el = document.getElementById("timer");
  if (!timerEnd || !el) return;
  const s = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
  el.textContent = "⏱ " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  if (s === 0) { el.textContent = "⏱ TIME'S UP"; el.classList.add("done"); timerEnd = null; }
}, 500);

load().then(() => document.querySelector('button[data-tool="next_step"]').focus());
</script>
</body>
</html>`;
