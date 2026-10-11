import type { Household } from "../../lib/contracts.js";

export function describeHousehold(h: Household): string {
  const people = h.members.map((m) => {
    const notes = [...m.allergies.map((a) => `allergic to ${a.replace("_", " ")}`), ...m.diets];
    return notes.length ? `${m.name} (${notes.join(", ")})` : m.name;
  });
  const rules = Object.entries(h.dayRules).map(([day, diet]) => `${diet} on ${day}`);
  return `${h.name}: ${people.join(", ")}.${rules.length ? ` House rules: ${rules.join(", ")}.` : ""}`;
}
