# Friction Log (submitted for up to +10% bonus)

| Date | Tool | Task attempted | Steps | Expected | Actual | Severity | Workaround | Suggestion |
|---|---|---|---|---|---|---|---|---|
| 2026-10-08 | Alexa AI CLI | Install the CLI to deploy an MCP add-on | Followed "Set Up Your Development Environment" | `npm i -g` from public npm, or clear instructions for obtaining access | CLI is only on a private CodeArtifact registry needing an AWS profile named `alexa-ai`; the docs never say how to get that profile's credentials | High (blocks deploy) | Pending: asking organizers | State how to obtain the `alexa-ai` profile (or publish to public npm); link it from the hackathon page |
| 2026-10-08 | Alexa+ MCP auth docs | Decide whether a dev-stage add-on needs OAuth | Read the quickstart, auth and test pages | A clear statement for dev/testing, and how a tool becomes "user-specific" | Not stated anywhere; Tier 2 trigger mechanism undocumented | Medium | Deploy unauthenticated first and observe | Add a "minimum auth for development" section and document the user-specific tool marker |
| 2026-10-08 | Alexa+ MCP Apps | Show cards on Fire TV | Read the layout/rendering guide | A Fire TV surface in the simulator | Only mobile, Echo Show 8/15 and voice-only | Low | TV app subscribes to our own SSE feed | Document Fire TV rendering support (or say none) |
