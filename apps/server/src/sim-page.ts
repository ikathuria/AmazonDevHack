// Simulated Alexa+ page (served at /sim). Voice in via the browser's Web Speech API, spoken replies via speechSynthesis,
// and a live mirror of the family board (same /state + SSE feed the Fire TV app uses). Clearly labelled as a simulation.
export const SIM_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Homebase · Alexa+ simulator</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;800&family=Archivo:wght@500;900&display=swap" rel="stylesheet">
<style>
  /* Dinner Departures tokens (design/tokens.json). Web pages use paper-on-bg; red is for safety only, amber marks "now". */
  :root { --bg:#0E0F0C; --panel:#1A1B17; --ink:#ECE6D8; --muted:#8E8B80; --line:#24251F; --accent:#FFB84D; --accent-ink:#0E0F0C; --warn:#FF4A3D; --chip:#24251F; --ok:#5BD18B; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.45 Archivo, system-ui, sans-serif; }
  header { padding:14px 16px; border-bottom:4px solid var(--accent); display:flex; gap:12px; align-items:baseline; flex-wrap:wrap; }
  header h1 { font-size:18px; margin:0; font-weight:900; letter-spacing:1px; text-transform:uppercase; }
  header small { color:var(--muted); }
  main { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1.2fr); gap:16px; padding:16px; max-width:1200px; margin:0 auto; }
  @media (max-width: 800px) { main { grid-template-columns: 1fr; } }
  section { background:var(--panel); border:0; border-radius:0; padding:16px; min-width:0; }
  h2 { font-family:'JetBrains Mono', monospace; font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin:0 0 10px; }
  #log { height:52vh; min-height:260px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:4px; }
  .msg { max-width:88%; padding:10px 12px; border-radius:0; }
  .you { align-self:flex-end; background:var(--chip); color:var(--ink); }
  .alexa { align-self:flex-start; background:var(--bg); border-left:4px solid var(--accent); }
  .calls { align-self:flex-start; display:flex; gap:6px; flex-wrap:wrap; }
  .call { font:12px 'JetBrains Mono', ui-monospace, monospace; border:1px solid var(--muted); border-radius:2px; padding:2px 8px; color:var(--muted); }
  .call.err { color:var(--warn); border-color:var(--warn); }
  form { display:flex; gap:8px; margin-top:12px; }
  input[type=text] { flex:1; min-width:0; padding:12px; border-radius:0; border:1px solid var(--line); background:var(--bg); color:var(--ink); font:inherit; }
  button { padding:12px 14px; border-radius:2px; border:0; background:var(--accent); color:var(--accent-ink); font:inherit; font-weight:600; cursor:pointer; }
  button.secondary { background:var(--chip); color:var(--ink); }
  button:focus-visible { outline:4px solid var(--accent); outline-offset:4px; }
  button[aria-pressed=true] { outline:4px solid var(--accent); outline-offset:4px; }
  .suggest { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }
  .suggest button { padding:6px 10px; font-size:13px; font-weight:500; }
  .board { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px; }
  @media (max-width: 520px) { .board { grid-template-columns: 1fr; } }
  .card { background:var(--bg); border:0; border-radius:0; padding:12px; min-width:0; }
  .card h3 { margin:0 0 8px; font:800 13px 'JetBrains Mono', monospace; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
  .card ul { margin:0; padding-left:18px; }
  .cook { grid-column: 1 / -1; }
  .step { font-size:22px; line-height:1.3; margin:6px 0; }
  .timer { font:800 28px 'JetBrains Mono', monospace; color:var(--accent); }
  .muted { color:var(--muted); }
  .blocked { color:var(--warn); font-size:14px; margin-top:6px; }
  .heard { font-size:13px; color:var(--muted); min-height:1.4em; }
  .today { font-weight:700; color:var(--accent); }
</style>
</head>
<body>
<header>
  <h1>Homebase · Alexa+ simulator</h1>
  <small style="color:var(--muted)">A simulated Alexa+ experience (allowed by the hackathon rules) driving the real Homebase tools. Not an Amazon product.</small>
</header>
<main>
  <section aria-label="Alexa simulator">
    <h2>Talk to Alexa</h2>
    <div id="log" aria-live="polite"></div>
    <form id="f">
      <button type="button" id="mic" class="secondary" aria-pressed="false" title="Hold a conversation by voice">🎤 Speak</button>
      <input id="q" type="text" placeholder="e.g. Alexa, plan dinners this week" autocomplete="off" aria-label="What you say to Alexa">
      <button type="submit">Send</button>
    </form>
    <div class="suggest" id="suggest"></div>
  </section>
  <section aria-label="Family board">
    <h2>Family board <span class="muted">(what the Fire TV shows)</span></h2>
    <div class="heard" id="heard"></div>
    <div class="board">
      <div class="card"><h3>This week</h3><ul id="plan"><li class="muted">No plan yet</li></ul><div id="blocked"></div></div>
      <div class="card"><h3>Chores today</h3><ul id="chores"><li class="muted">No rota yet</li></ul></div>
      <div class="card cook"><h3>Now cooking</h3><div id="cook" class="muted">Nothing cooking</div><div id="timer" class="timer"></div></div>
      <div class="card"><h3>Shopping</h3><ul id="shopping"><li class="muted">Empty</li></ul></div>
      <div class="card"><h3>Household</h3><div id="household" class="muted"></div></div>
    </div>
  </section>
</main>
<script>
const HH = "patels";
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const NAMES = { mon:"Mon", tue:"Tue", wed:"Wed", thu:"Thu", fri:"Fri", sat:"Sat", sun:"Sun" };
const todayKey = () => DAYS[(new Date().getDay() + 6) % 7];
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
let state = null, history = [], timerEnd = null, members = {}, choreNames = {};

function add(cls, html) { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; $("log").append(d); $("log").scrollTop = 1e9; }

async function send(text) {
  text = text.replace(/^alexa[,!]?\\s*/i, "").trim();
  if (!text) return;
  add("msg you", esc(text));
  $("q").value = "";
  const r = await fetch("/api/sim/converse", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ utterance: text, history }) });
  const j = await r.json().catch(() => ({ reply: "The simulator didn't get an answer back, so nothing changed. Try again." }));
  if (j.calls?.length) add("calls", j.calls.map((c) => '<span class="call' + (c.isError ? " err" : "") + '">' + esc(c.name) + "</span>").join(""));
  add("msg alexa", esc(j.reply || j.error || "…"));
  history = j.history || history;
  if ("speechSynthesis" in window && j.reply) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(j.reply)); }
}

$("f").addEventListener("submit", (e) => { e.preventDefault(); send($("q").value); });
["plan dinners this week", "split the chores fairly", "who's on dishes tonight?", "make Friday peanut noodles", "let's cook tonight's dinner", "next step", "start the timer", "what do we need to buy?"]
  .forEach((s) => { const b = document.createElement("button"); b.className = "secondary"; b.type = "button"; b.textContent = s; b.onclick = () => send(s); $("suggest").append(b); });

// Voice input (Chrome/Edge/Safari). Each press listens for one request.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) { $("mic").disabled = true; $("mic").title = "Voice input isn't supported in this browser; type instead."; }
else {
  const rec = new SR(); rec.lang = "en-US"; rec.interimResults = false;
  rec.onresult = (e) => send(e.results[0][0].transcript);
  rec.onend = () => $("mic").setAttribute("aria-pressed", "false");
  $("mic").onclick = () => { $("mic").setAttribute("aria-pressed", "true"); rec.start(); };
}

function render() {
  if (!state) return;
  members = Object.fromEntries(state.household.members.map((m) => [m.id, m.name]));
  choreNames = Object.fromEntries((state.chores || []).map((c) => [c.id, c.name]));
  $("household").innerHTML = state.household.members.map((m) => esc(m.name) + (m.allergies.length ? " · allergic to " + esc(m.allergies.join(", ")) : "") + (m.diets.length ? " · " + esc(m.diets.join(", ")) : "")).join("<br>");
  const p = state.plan;
  if (p && p.status === "drafting") $("plan").innerHTML = '<li class="muted">Drafting… checking allergies</li>';
  else if (p && p.status === "ready") $("plan").innerHTML = DAYS.filter((d) => p.days[d]).map((d) => '<li class="' + (d === todayKey() ? "today" : "") + '">' + NAMES[d] + ": " + esc(p.days[d].title) + "</li>").join("");
  $("blocked").innerHTML = (p?.blocked || []).map((b) => '<div class="blocked">⛔ Skipped ' + esc(b.title) + ": " + esc(b.reason) + "</div>").join("");
  const today = (state.choreAssignments || []).filter((a) => a.day === todayKey());
  $("chores").innerHTML = today.length ? today.map((a) => "<li>" + esc(members[a.memberId] || a.memberId) + ": " + esc(choreNames[a.choreId] || a.choreId) + (a.done ? " ✓" : "") + "</li>").join("") : '<li class="muted">No rota yet</li>';
  const c = state.cook;
  $("cook").innerHTML = c && c.recipe ? "<strong>" + esc(c.recipe.title) + "</strong> · step " + (c.session.stepIndex + 1) + " of " + c.recipe.steps.length + '<div class="step">' + esc(c.recipe.steps[c.session.stepIndex].text) + "</div>" : "Nothing cooking";
  $("shopping").innerHTML = (state.shopping || []).length ? state.shopping.map((i) => "<li>" + (i.checked ? "<s>" + esc(i.name) + "</s>" : esc(i.name)) + "</li>").join("") : '<li class="muted">Empty</li>';
}

function apply(e) {
  const ev = e.event;
  if (ev.type === "plan.updated") state.plan = ev.plan;
  else if (ev.type === "chores.updated") state.choreAssignments = ev.assignments;
  else if (ev.type === "household.updated") state.household = ev.household;
  else if (ev.type === "shopping.updated") state.shopping = ev.items;
  else if (ev.type === "cook.step") { fetch("/households/" + HH + "/state").then((r) => r.json()).then((s) => { state = s; render(); }); return; }
  else if (ev.type === "cook.timer") timerEnd = new Date(ev.endsAt).getTime();
  else if (ev.type === "voice.heard") $("heard").textContent = 'Alexa heard: "' + ev.utterance + '"';
  else if (ev.type === "plan.rerouted") { $("blocked").innerHTML = '<div class="blocked">⚠ ' + esc(ev.cancelled.title.toUpperCase()) + " CANCELLED · ALLERGY" + (ev.replacement ? " → " + esc(ev.replacement.title.toUpperCase()) : "") + "</div>" + $("blocked").innerHTML; return; }
  render();
}

setInterval(() => {
  if (!timerEnd) return;
  const s = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
  $("timer").textContent = "⏱ " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  if (s === 0) { $("timer").textContent = "⏱ Time's up!"; timerEnd = null; }
}, 500);

fetch("/households/" + HH + "/state").then((r) => r.json()).then((s) => {
  state = s; render();
  const es = new EventSource("/households/" + HH + "/events?after=" + s.lastSeq);
  es.onmessage = () => {};
  ["plan.updated","plan.rerouted","chores.updated","household.updated","shopping.updated","cook.step","cook.timer","voice.heard"].forEach((t) => es.addEventListener(t, (m) => apply(JSON.parse(m.data))));
});
</script>
</body>
</html>`;
