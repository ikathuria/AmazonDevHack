# Classic Alexa skill: "home base"

An on-device voice front end for Homebase's tools, so a real Echo or Fire TV can drive the board. **Why it exists:** Alexa+ MCP Preview access (needed to deploy our MCP server as an Alexa+ add-on) is waitlisted (see `FRICTION_LOG.md`, 2026-10-14). Our Alexa+ track entry is the live MCP server (`/mcp`) plus the simulated Alexa+ experience (`/sim`); this skill is the honest way to show real Alexa hardware in the demo.

- **Invocation:** "Alexa, ask home base to …". Dev stage only, enabled on the developer account; not published.
- **Skill ID:** `skill-id.txt` · **Endpoint:** the `HomebaseStack-Skill…` Lambda (CDK, `infra/`), locked to this skill ID via `-c skillId` (saved in `infra/cdk.json`).
- **Handler:** `apps/server/src/skill.ts` maps each intent to one Homebase tool and runs it in-process (same registry as MCP/REST). Cooking turns keep the session open, so "next step" works without re-invoking.
- **Interaction model:** generated from the seed data. Don't hand-edit `skill-package/interactionModels/custom/en-US.json`; run `npm --prefix apps/server run skill:model`.

## Update the skill
```bash
npm --prefix apps/server run skill:model
ask smapi set-interaction-model -s "$(cat skill/skill-id.txt)" -g development -l en-US --interaction-model "file:skill/skill-package/interactionModels/custom/en-US.json"
ask smapi update-skill-manifest -s "$(cat skill/skill-id.txt)" -g development --manifest "file:skill/skill-package/skill.json"
npm run deploy    # handler code changes
```

## Test without a device
```bash
python3 skill/simulate.py "ask home base to plan dinners this week"
python3 skill/simulate.py "ask home base to start cooking chana masala" "next step" "start the timer" "stop"
```

## Test on your Echo / Fire TV
The skill is enabled on the developer account's Amazon login, so any Echo or Fire TV signed in to that account can use it. Say "Alexa, ask home base what's for dinner tonight" and watch `<ServerUrl>/board`.
