// Chore tools: fair weekly rota, "who's on dishes tonight?", marking chores done.
import { z } from "zod";
import { defineTool } from "../../lib/tools.js";
import { docs, matchByName, notSetUp, type ChoreState } from "../../lib/docs.js";
import { DAY_NAMES, parseDay, weekOf } from "../../lib/time.js";
import { assignWeek } from "./rotation.js";

export const choreTools = [
  defineTool({
    name: "assign_chores",
    title: "Split this week's chores fairly",
    description: "Creates this week's chore rota, splitting chores fairly by effort and by who did more in past weeks. Children only get small jobs. Use for 'split the chores', 'make a chore chart' or 'redo the rota'.",
    input: {},
    handler: async (ctx) => {
      const d = docs(ctx);
      const [h, chores, prev] = await Promise.all([d.household(), d.chores(), d.choreState()]);
      if (!h) return notSetUp;
      if (!chores.length) return { text: "There are no chores set up yet.", isError: true };
      const week = weekOf(ctx.now(), h.timezone);
      // History only accumulates across weeks; re-running within a week starts from last week's totals.
      const history = prev?.weekOf === week ? prev.history : (prev ? sumLoad(prev, chores) : {});
      const { assignments, load } = assignWeek(chores, h.members, history);
      const state: ChoreState = { weekOf: week, assignments, history };
      await d.saveChoreState(state);
      await d.emit({ type: "chores.updated", assignments });
      const weekLoad = Object.fromEntries(h.members.map((m) => [m.id, load[m.id] - (history[m.id] ?? 0)]));
      const summary = h.members.map((m) => `${m.name} ${weekLoad[m.id]} points`).join(", ");
      return { text: `Chores are split for the week, weighted by effort: ${summary}. It's on the TV.`, data: { assignments, weekLoad } };
    },
  }),
  defineTool({
    name: "whos_on",
    title: "Who's on a chore",
    description: "Says who is doing a chore on a day (default today), or what one person has to do. Use for 'who's on dishes tonight?' or 'what are Maya's chores today?'.",
    input: { chore: z.string().optional(), member: z.string().optional(), day: z.string().optional() },
    readOnly: true,
    handler: async (ctx, a) => {
      const d = docs(ctx);
      const [h, chores, state] = await Promise.all([d.household(), d.chores(), d.choreState()]);
      if (!h) return notSetUp;
      if (!state) return { text: "There's no chore rota yet. Say 'split the chores' to make one." };
      const wd = parseDay(a.day, ctx.now(), h.timezone);
      const today = state.assignments.filter((x) => x.day === wd);
      const nameOf = (id: string) => h.members.find((m) => m.id === id)?.name ?? id;
      const choreName = (id: string) => chores.find((c) => c.id === id)?.name ?? id;
      if (a.member) {
        const m = matchByName(h.members, a.member, (x) => x.name);
        if (!m) return { text: `I don't know ${a.member}.`, isError: true };
        const mine = today.filter((x) => x.memberId === m.id);
        return { text: mine.length ? `${m.name} is on ${mine.map((x) => choreName(x.choreId) + (x.done ? " (done)" : "")).join(" and ")} ${dayPhrase(wd, ctx.now(), h.timezone)}.` : `${m.name} has no chores ${dayPhrase(wd, ctx.now(), h.timezone)}.` };
      }
      if (a.chore) {
        const c = matchByName(chores, a.chore, (x) => x.name) ?? matchByName(chores, a.chore, (x) => x.id);
        const hit = c && (today.find((x) => x.choreId === c.id) ?? state.assignments.find((x) => x.choreId === c.id));
        if (!c || !hit) return { text: `${a.chore} isn't on the rota ${dayPhrase(wd, ctx.now(), h.timezone)}.` };
        return { text: `${nameOf(hit.memberId)} is on ${c.name} ${hit.day === wd ? dayPhrase(wd, ctx.now(), h.timezone) : `on ${DAY_NAMES[hit.day]}`}${hit.done ? ", and it's already done" : ""}.`, data: { assignment: hit } };
      }
      return { text: today.map((x) => `${nameOf(x.memberId)}: ${choreName(x.choreId)}`).join(". ") + "." };
    },
  }),
  defineTool({
    name: "mark_chore_done",
    title: "Mark a chore done",
    description: "Marks a chore as done for a day (default today). Use for 'dishes are done' or 'Arjun took out the trash'.",
    input: { chore: z.string(), day: z.string().optional() },
    handler: async (ctx, a) => {
      const d = docs(ctx);
      const [h, chores, state] = await Promise.all([d.household(), d.chores(), d.choreState()]);
      if (!h) return notSetUp;
      if (!state) return { text: "There's no chore rota yet." };
      const c = matchByName(chores, a.chore, (x) => x.name) ?? matchByName(chores, a.chore, (x) => x.id);
      const wd = parseDay(a.day, ctx.now(), h.timezone);
      const hit = c && (state.assignments.find((x) => x.choreId === c.id && x.day === wd) ?? state.assignments.find((x) => x.choreId === c.id && !x.done));
      if (!c || !hit) return { text: `I couldn't find ${a.chore} on the rota.`, isError: true };
      hit.done = true;
      await d.saveChoreState(state);
      await d.emit({ type: "chores.updated", assignments: state.assignments });
      return { text: `Nice. ${c.name} is marked done.`, data: { assignment: hit } };
    },
  }),
  defineTool({
    name: "chore_balance",
    title: "Chore balance",
    description: "Reports how fairly chores are split this week, in effort points per person and how many are done. Use for 'is the chore split fair?' or 'who's done the most this week?'.",
    input: {},
    readOnly: true,
    handler: async (ctx) => {
      const d = docs(ctx);
      const [h, chores, state] = await Promise.all([d.household(), d.chores(), d.choreState()]);
      if (!h) return notSetUp;
      if (!state) return { text: "There's no chore rota yet." };
      const effort = (id: string) => chores.find((c) => c.id === id)?.effort ?? 1;
      const lines = h.members.map((m) => {
        const mine = state.assignments.filter((x) => x.memberId === m.id);
        const pts = mine.reduce((s, x) => s + effort(x.choreId), 0);
        const done = mine.filter((x) => x.done).reduce((s, x) => s + effort(x.choreId), 0);
        return `${m.name}: ${done} of ${pts} points done`;
      });
      return { text: lines.join(". ") + "." };
    },
  }),
];

function sumLoad(state: ChoreState, chores: { id: string; effort: number }[]) {
  const total = { ...state.history };
  for (const a of state.assignments) total[a.memberId] = (total[a.memberId] ?? 0) + (chores.find((c) => c.id === a.choreId)?.effort ?? 1);
  return total;
}

function dayPhrase(wd: string, now: Date, tz: string) {
  return wd === parseDay("today", now, tz) ? "today" : `on ${DAY_NAMES[wd as keyof typeof DAY_NAMES]}`;
}
