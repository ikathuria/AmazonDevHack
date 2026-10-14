// Backstop family board (served at /board): a 10-foot web version of the Fire TV app, for any TV browser or laptop.
// It is NOT the Fire TV submission (that's apps/tv on Vega); it keeps the demo safe if the Vega app slips.
// Same data path the Vega app uses: GET /households/:id/state once, then follow the SSE feed; buttons call POST /api/tools/:name.
// D-pad: arrow keys move focus between buttons, Enter/OK activates (Fire TV browsers map the remote to these keys).
export const BOARD_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Homebase Family Board</title>
<style>
  :root { --bg:#101513; --panel:#18201d; --ink:#eef2ef; --muted:#9fb0a8; --line:#2a3531; --accent:#4fbf94; --accent-ink:#0b100e; --warn:#f08b6c; --focus:#ffd479; }
  * { box-sizing:border-box; }
  html, body { margin:0; height:100%; background:var(--bg); color:var(--ink); font:clamp(16px, 1.55vw, 30px)/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; }
  body { padding:2.2vw 3vw; display:grid; grid-template-rows:auto 1fr auto; gap:1.6vw; }
  header { display:flex; align-items:baseline; gap:1.2em; flex-wrap:wrap; }
  header h1 { margin:0; font-size:1.7em; letter-spacing:-.01em; }
  #clock { color:var(--muted); }
  #status { margin-left:auto; color:var(--muted); font-size:.85em; }
  #status.off { color:var(--warn); }
  main { display:grid; grid-template-columns: 1.15fr 1fr; grid-template-rows: auto auto; gap:1.6vw; min-height:0; }
  @media (max-width: 900px) { main { grid-template-columns:1fr; } body { font-size:18px; } }
  section { background:var(--panel); border:1px solid var(--line); border-radius:1em; padding:1.1em 1.3em; min-width:0; }
  h2 { margin:0 0 .5em; font-size:.8em; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
  ul { list-style:none; margin:0; padding:0; }
  li { padding:.18em 0; }
  .today { color:var(--accent); font-weight:700; }
  .muted { color:var(--muted); }
  .blocked { color:var(--warn); font-size:.8em; margin-top:.5em; }
  #cooking { grid-row: span 2; display:flex; flex-direction:column; }
  #step { font-size:1.9em; line-height:1.25; margin:.3em 0 .6em; flex:1; }
  #recipe { font-weight:700; }
  #timer { font:700 2.4em ui-monospace, Menlo, monospace; color:var(--accent); min-height:1.2em; }
  #timer.done { color:var(--warn); }
  .controls { display:flex; gap:.6em; flex-wrap:wrap; }
  button { font:inherit; font-size:.9em; padding:.55em 1em; border-radius:.6em; border:2px solid var(--line); background:#22302b; color:var(--ink); cursor:pointer; }
  button.primary { background:var(--accent); color:var(--accent-ink); border-color:var(--accent); font-weight:700; }
  button:focus { outline:none; border-color:var(--focus); box-shadow:0 0 0 .25em color-mix(in srgb, var(--focus) 35%, transparent); }
  footer { display:flex; gap:1em; align-items:center; flex-wrap:wrap; }
  #heard { color:var(--muted); font-size:.9em; flex:1; min-width:12em; }
  #toast { position:fixed; left:50%; bottom:6vh; transform:translateX(-50%); background:var(--accent); color:var(--accent-ink); padding:.6em 1.2em; border-radius:.6em; font-weight:700; opacity:0; transition:opacity .25s; pointer-events:none; max-width:90vw; }
  #toast.show { opacity:1; }
  .progress { height:.35em; background:var(--line); border-radius:1em; overflow:hidden; margin-bottom:.4em; }
  .progress > div { height:100%; background:var(--accent); width:0; transition:width .3s; }
</style>
</head>
<body>
<header>
  <h1>Homebase</h1><span id="clock"></span><span id="hh" class="muted"></span>
  <span id="status">connecting…</span>
</header>
<main>
  <section id="cooking" aria-label="Now cooking">
    <h2>Now cooking</h2>
    <div class="progress"><div id="bar"></div></div>
    <div><span id="recipe" class="muted">Nothing cooking</span> <span id="stepno" class="muted"></span></div>
    <div id="step" class="muted">Say "Alexa, ask Homebase to start cooking tonight's dinner", or press Start.</div>
    <div id="timer" aria-live="assertive"></div>
    <div class="controls" role="group" aria-label="Cooking controls">
      <button data-tool="start_cooking" class="primary">Start tonight's dinner</button>
      <button data-tool="previous_step">◀ Back</button>
      <button data-tool="repeat_step">Repeat</button>
      <button data-tool="next_step" class="primary">Next ▶</button>
      <button data-tool="start_timer">⏱ Timer</button>
    </div>
  </section>
  <section aria-label="This week">
    <h2>This week</h2>
    <ul id="plan"><li class="muted">No plan yet</li></ul>
    <div id="blocked"></div>
  </section>
  <section aria-label="Chores and shopping">
    <h2>Chores today</h2>
    <ul id="chores"><li class="muted">No rota yet</li></ul>
    <h2 style="margin-top:1em">Shopping</h2>
    <ul id="shopping"><li class="muted">Empty</li></ul>
  </section>
</main>
<footer>
  <div id="heard"></div>
  <button data-tool="plan_week">Plan the week</button>
  <button data-tool="assign_chores">Split chores</button>
  <button data-tool="shopping_list">Shopping list</button>
</footer>
<div id="toast" role="status"></div>
<script>
const HH = new URLSearchParams(location.search).get("household") || "patels";
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const NAMES = { mon:"Monday", tue:"Tuesday", wed:"Wednesday", thu:"Thursday", fri:"Friday", sat:"Saturday", sun:"Sunday" };
const todayKey = () => DAYS[(new Date().getDay() + 6) % 7];
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
let state = null, timerEnd = null, cursor = 0, es = null;

function toast(text) { $("toast").textContent = text; $("toast").classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => $("toast").classList.remove("show"), 3500); }
function chime() { try { const a = new AudioContext(); [0, .25, .5].forEach((t) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.2, a.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + t + .2); o.connect(g).connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + .22); }); } catch {} }

function render() {
  if (!state) return;
  const names = Object.fromEntries(state.household.members.map((m) => [m.id, m.name]));
  const choreNames = Object.fromEntries((state.chores || []).map((c) => [c.id, c.name]));
  $("hh").textContent = state.household.name;
  const p = state.plan;
  if (p && p.status === "drafting") $("plan").innerHTML = '<li class="muted">Drafting… checking everyone\\'s allergies</li>';
  else if (p && p.status === "ready") $("plan").innerHTML = DAYS.filter((d) => p.days[d]).map((d) => '<li class="' + (d === todayKey() ? "today" : "") + '">' + (d === todayKey() ? "Tonight" : NAMES[d]) + " · " + esc(p.days[d].title) + "</li>").join("");
  else $("plan").innerHTML = '<li class="muted">No plan yet</li>';
  $("blocked").innerHTML = (p?.blocked || []).slice(0, 2).map((b) => '<div class="blocked">⛔ Skipped ' + esc(b.title) + " · " + esc(b.reason) + "</div>").join("");
  const today = (state.choreAssignments || []).filter((a) => a.day === todayKey());
  $("chores").innerHTML = today.length ? today.map((a) => "<li>" + (a.done ? "✓ " : "") + esc(names[a.memberId] || a.memberId) + " · " + esc(choreNames[a.choreId] || a.choreId) + "</li>").join("") : '<li class="muted">No rota yet</li>';
  const open = (state.shopping || []).filter((i) => !i.checked);
  $("shopping").innerHTML = open.length ? open.slice(0, 8).map((i) => "<li>" + esc(i.name) + "</li>").join("") + (open.length > 8 ? '<li class="muted">+' + (open.length - 8) + " more</li>" : "") : '<li class="muted">Nothing needed</li>';
  const c = state.cook;
  if (c && c.recipe) {
    const i = c.session.stepIndex, n = c.recipe.steps.length;
    $("recipe").textContent = c.recipe.title; $("recipe").classList.remove("muted");
    $("stepno").textContent = "· step " + (i + 1) + " of " + n;
    $("step").textContent = c.recipe.steps[i].text; $("step").classList.remove("muted");
    $("bar").style.width = Math.round(((i + 1) / n) * 100) + "%";
  }
}

function apply(e) {
  cursor = Math.max(cursor, e.seq);
  const ev = e.event;
  if (ev.type === "plan.updated") state.plan = ev.plan;
  else if (ev.type === "chores.updated") state.choreAssignments = ev.assignments;
  else if (ev.type === "household.updated") state.household = ev.household;
  else if (ev.type === "shopping.updated") state.shopping = ev.items;
  else if (ev.type === "cook.step") { load(); return; }
  else if (ev.type === "cook.timer") { timerEnd = new Date(ev.endsAt).getTime(); $("timer").classList.remove("done"); toast("Timer started · " + ev.label); }
  else if (ev.type === "voice.heard") { $("heard").textContent = 'Alexa heard: "' + ev.utterance + '"'; }
  render();
}

function connect() {
  if (es) es.close();
  es = new EventSource("/households/" + encodeURIComponent(HH) + "/events?after=" + cursor);
  es.onopen = () => { $("status").textContent = "● live"; $("status").classList.remove("off"); };
  es.onerror = () => { $("status").textContent = "reconnecting…"; $("status").classList.add("off"); };
  ["plan.updated","chores.updated","household.updated","shopping.updated","cook.step","cook.timer","voice.heard"].forEach((t) => es.addEventListener(t, (m) => apply(JSON.parse(m.data))));
}

async function load() {
  const r = await fetch("/households/" + encodeURIComponent(HH) + "/state");
  if (!r.ok) { $("status").textContent = "household not found"; $("status").classList.add("off"); return; }
  state = await r.json();
  // Restore a running timer from the saved cook session (its start event may predate this page load).
  const ends = state.cook?.session?.timerEndsAt ? new Date(state.cook.session.timerEndsAt).getTime() : 0;
  if (ends > Date.now()) timerEnd = ends;
  if (!es) { cursor = state.lastSeq; connect(); }
  render();
}

document.querySelectorAll("button[data-tool]").forEach((b) => b.addEventListener("click", async () => {
  const r = await fetch("/api/tools/" + b.dataset.tool, { method:"POST", headers:{ "content-type":"application/json" }, body:"{}" });
  const j = await r.json().catch(() => ({}));
  if (j.text) toast(j.text.length > 140 ? j.text.slice(0, 137) + "…" : j.text);
}));

// D-pad: arrow keys move focus between buttons in reading order, Enter activates.
document.addEventListener("keydown", (e) => {
  const btns = [...document.querySelectorAll("button")];
  const i = btns.indexOf(document.activeElement);
  if (["ArrowRight","ArrowDown"].includes(e.key)) { btns[(i + 1) % btns.length].focus(); e.preventDefault(); }
  if (["ArrowLeft","ArrowUp"].includes(e.key)) { btns[(i - 1 + btns.length) % btns.length].focus(); e.preventDefault(); }
});

setInterval(() => {
  $("clock").textContent = new Date().toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
  if (!timerEnd) return;
  const s = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
  $("timer").textContent = "⏱ " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  if (s === 0) { $("timer").textContent = "⏱ Time's up!"; $("timer").classList.add("done"); chime(); timerEnd = null; }
}, 500);

load().then(() => document.querySelector("button[data-tool=next_step]").focus());
</script>
</body>
</html>`;
