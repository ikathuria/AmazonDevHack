import { describe, expect, it } from "vitest";
import { parseDay, today, weekOf } from "./time.js";

// 2026-10-15 is a Thursday. 03:00 UTC is still Wednesday evening in Chicago.
const thuUtcEarly = new Date("2026-10-15T03:00:00Z");

describe("time helpers", () => {
  it("uses the household timezone for today", () => {
    expect(today(thuUtcEarly, "America/Chicago")).toBe("wed");
    expect(today(thuUtcEarly, "UTC")).toBe("thu");
  });

  it("returns the Monday of the local week", () => {
    expect(weekOf(new Date("2026-10-15T18:00:00Z"), "America/Chicago")).toBe("2026-10-12");
    expect(weekOf(new Date("2026-10-18T18:00:00Z"), "America/Chicago")).toBe("2026-10-12"); // Sunday
  });

  it("parses spoken days", () => {
    const now = new Date("2026-10-15T18:00:00Z");
    expect(parseDay("tonight", now, "America/Chicago")).toBe("thu");
    expect(parseDay("tomorrow", now, "America/Chicago")).toBe("fri");
    expect(parseDay("Tuesday", now, "America/Chicago")).toBe("tue");
    expect(parseDay(undefined, now, "America/Chicago")).toBe("thu");
  });
});
