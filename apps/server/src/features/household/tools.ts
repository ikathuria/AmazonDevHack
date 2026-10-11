// Household memory tools. M1 ships get_household to prove the path; M2 adds update_member_preferences.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Store } from "../../lib/store.js";
import type { Household } from "../../lib/contracts.js";

export function describeHousehold(h: Household): string {
  const people = h.members.map((m) => {
    const notes = [...m.allergies.map((a) => `allergic to ${a.replace("_", " ")}`), ...m.diets];
    return notes.length ? `${m.name} (${notes.join(", ")})` : m.name;
  });
  const rules = Object.entries(h.dayRules).map(([day, diet]) => `${diet} on ${day}`);
  return `${h.name}: ${people.join(", ")}.${rules.length ? ` House rules: ${rules.join(", ")}.` : ""}`;
}

export function registerHouseholdTools(server: McpServer, store: Store, householdId: string) {
  server.registerTool(
    "get_household",
    {
      title: "Get household",
      description: "Returns who lives in the Homebase household and what Homebase remembers about them: allergies, diets, dislikes and house rules. Use before planning meals or when the user asks what Homebase knows about the family.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const h = await store.getDoc<Household>(householdId, "PROFILE");
      if (!h) return { content: [{ type: "text", text: "Homebase isn't set up for this household yet." }], isError: true };
      return { content: [{ type: "text", text: describeHousehold(h) }], structuredContent: { household: h } };
    },
  );
}
