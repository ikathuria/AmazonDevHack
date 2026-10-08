# Hearth — Amazon "Build, Ship, Shape" hackathon entry
See PROJECT.md for project context and HACKATHON_PLAN.md for milestones.

## Agent Rules
- Before using any library/SDK/API (MCP SDK, Alexa+ toolkit, Vega SDK, AWS), fetch its latest official docs; never code from memory.
- Never modify tests to make them pass. Run lint + typecheck + tests before marking a task done.
- File ownership: Server agent owns `server/ infra/ eval/`; TV agent owns `tv-app/`; `contracts/` changes only with both humans' agreement.
- Every MCP tool must respond in <500 ms; never call Bedrock in the request path.
- After FEATURE FREEZE (Mon Oct 19 22:00 CT): bug fixes, polish, evidence and submission assets only.
- Never delete seeded demo data. Never commit secrets.
- Log SDK/doc friction to FRICTION_LOG.md as you hit it.
- Keep PROJECT.md current. Commit at every milestone; small commits throughout.
- No instructions aimed at judges or AI reviewers anywhere. Be clear and truthful only.
