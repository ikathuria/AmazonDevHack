// Fair chore rotation. Deterministic on purpose: fairness should be explainable and testable, not an LLM's opinion.
// Load = sum of chore effort a member has carried, including history from previous weeks.
import type { Chore, ChoreAssignment, Member, Weekday } from "../../lib/contracts.js";
import { WEEKDAYS } from "../../lib/time.js";

// Weekly chores land on a fixed day so the rota is predictable.
const WEEKLY_DAY: Weekday = "sat";

export function canDo(member: Member, chore: Chore) {
  if (member.role === "child") return chore.effort <= 1;
  if (member.role === "teen") return chore.effort <= 3;
  return true;
}

export type RotationResult = { assignments: ChoreAssignment[]; load: Record<string, number> };

export function assignWeek(chores: Chore[], members: Member[], history: Record<string, number> = {}): RotationResult {
  const load: Record<string, number> = Object.fromEntries(members.map((m) => [m.id, history[m.id] ?? 0]));
  const lastDoer = new Map<string, string>(); // choreId -> memberId, to avoid the same person every day
  const occurrences = chores.flatMap((c) => (c.frequency === "daily" ? WEEKDAYS.map((day) => ({ chore: c, day })) : [{ chore: c, day: WEEKLY_DAY }]));
  // Heaviest jobs first so they spread out before small ones fill the gaps.
  occurrences.sort((a, b) => b.chore.effort - a.chore.effort || WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || a.chore.id.localeCompare(b.chore.id));

  const assignments: ChoreAssignment[] = [];
  for (const { chore, day } of occurrences) {
    const eligible = members.filter((m) => canDo(m, chore));
    if (!eligible.length) continue;
    const pick = [...eligible].sort((a, b) => {
      const repeatA = lastDoer.get(chore.id) === a.id ? 0.5 : 0;
      const repeatB = lastDoer.get(chore.id) === b.id ? 0.5 : 0;
      return load[a.id] + repeatA - (load[b.id] + repeatB) || a.id.localeCompare(b.id);
    })[0];
    load[pick.id] += chore.effort;
    lastDoer.set(chore.id, pick.id);
    assignments.push({ choreId: chore.id, memberId: pick.id, day, done: false });
  }
  assignments.sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || a.choreId.localeCompare(b.choreId));
  return { assignments, load };
}
