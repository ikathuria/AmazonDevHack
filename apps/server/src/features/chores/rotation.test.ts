import { describe, expect, it } from "vitest";
import { Chore, Member } from "../../lib/contracts.js";
import { assignWeek, canDo } from "./rotation.js";
import { seedHousehold } from "../../scripts/seed-data.js";

const chores = seedHousehold.docs.find((d) => d.kind === "CHORES")!.doc as Chore[];
const members = (seedHousehold.docs.find((d) => d.kind === "PROFILE")!.doc as { members: Member[] }).members;
const maxEffort = Math.max(...chores.map((c) => c.effort));

describe("chore rotation", () => {
  it("assigns every chore occurrence: 7 per daily chore, 1 per weekly", () => {
    const { assignments } = assignWeek(chores, members);
    const daily = chores.filter((c) => c.frequency === "daily").length;
    const weekly = chores.length - daily;
    expect(assignments).toHaveLength(daily * 7 + weekly);
  });

  it("only gives children effort-1 chores", () => {
    const { assignments } = assignWeek(chores, members);
    const maya = members.find((m) => m.id === "maya")!;
    for (const a of assignments.filter((x) => x.memberId === "maya")) {
      expect(canDo(maya, chores.find((c) => c.id === a.choreId)!)).toBe(true);
    }
  });

  it("keeps adults within one chore of each other over 8 weeks (history carried over)", () => {
    let history: Record<string, number> = {};
    for (let week = 0; week < 8; week++) history = assignWeek(chores, members, history).load;
    expect(Math.abs(history.priya - history.arjun)).toBeLessThanOrEqual(maxEffort);
  });

  it("evens out a lopsided history", () => {
    const { load } = assignWeek(chores, members, { priya: 40, arjun: 0, maya: 0 });
    expect(load.arjun).toBeGreaterThan(load.priya - 40);
  });

  it("is deterministic", () => {
    expect(assignWeek(chores, members)).toEqual(assignWeek(chores, members));
  });
});
