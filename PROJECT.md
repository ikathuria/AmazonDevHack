# PROJECT.md — Hearth

**What:** Alexa+ MCP add-on that remembers a household (diet, members, chores) and drives a Fire TV (Vega) kitchen board for hands-free cook-along.
**Deadline:** Fri 2026-10-23 14:00 CT · submit by Thu Oct 22 18:00 CT · feature freeze Mon Oct 19 22:00 CT
**Stack:** TS MCP server (spec 2025-11-25, Streamable HTTP) on AWS Lambda · DynamoDB · Bedrock (async only) · WebSocket/SSE → React Native for Vega app
**Structure (planned):** server/ · tv-app/ · contracts/ · infra/ · eval/ · docs/
**Status:** Planning done; Milestone 0 (kill test) not started.

## Decision log
- 2026-10-08: Idea = A+D mix (cook-along + household chores/meal agent). Tracks: Alexa+ (primary) + Fire TV; mini: AWS Builder.
