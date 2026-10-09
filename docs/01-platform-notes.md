# 01 — Platform notes (M0, 2026-10-08)

Sources: Alexa+ add-on docs ([quickstart](https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-quickstart.html), [dev environment](https://developer.amazon.com/docs/alexaplus/add-ons/set-up-your-development-environment.html), [auth](https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-authentication.html), [testing](https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-test-add-ons.html)). Re-fetch before relying on any of this.

## Pinned versions
- Node 24.18.0 (Alexa CLI requires Node 24+)
- @modelcontextprotocol/sdk 1.32.1 (`LATEST_PROTOCOL_VERSION = '2025-11-25'`, matching what Alexa+ requires)
- hono 4.13.13, zod 4.x, TypeScript 7.0.2 (needs `"types": ["node"]` explicitly)

## Alexa AI CLI install (not on public npm)
1. Requires an **AWS CLI profile named `alexa-ai`**, then:
   `aws codeartifact login --tool npm --domain alexa-ai --repository npm-packages --domain-owner 372468808636 --region us-west-2 --namespace @alexa-ai --profile alexa-ai`
   (token lasts 12 h)
2. `npm install -g @alexa-ai/cli` → `alexa-ai --version` → `alexa-ai configure` (Login with Amazon; credentials stored in `~/.alexa-ai/credentials`)
3. Also needed: a free Alexa developer account with phone and address set, marketplace = US, device language en-US, and an AWS account.
- **OPEN:** where the `alexa-ai` profile credentials come from (the docs don't say; possibly preview access). Ask on the hackathon Discord/forum and log in FRICTION_LOG.

## Scaffold / deploy
- `alexa-ai new mcp --name "Homebase" --locale en-US --mcp-server-url "https://<url>/mcp"`, then edit `addon-package/addon.json` → `alexa-ai deploy` (development stage; returns Add-on ID + version) → later `alexa-ai submit`.
- addon.json needs:
  - 3–4 example phrases
  - privacy and terms HTTPS URLs
  - **6 light icon sizes** (72, 64, 88, 126, 180, 241 px)
  - ≥1 carousel image (600x900)
  - endpoint `integrations[].config.endpoints.default.uri`
- Tool info refreshes only on deploy.

## Answers to M0 questions
- **(a) Is account linking required at dev stage?** UNANSWERED by the docs. The certification checklist requires a 401 (without `WWW-Authenticate`) for unauthenticated requests, OAuth 2.1 + PKCE (S256), RFC 9728 metadata, and Bearer tokens. Tier 1 (client_credentials) is described for "private" servers. Tier 2 (auth code + PKCE) is used "only when a user-specific tool is invoked". The docs don't say how a tool is marked user-specific. **Test empirically:** deploy the unauthenticated spike first.
- **(b) MCP Apps surfaces:** simulator previews mobile, Echo Show 8, Echo Show 15 and voice-only. **No Fire TV surface**, so the TV app subscribes to our SSE feed.
- **(c) SSE on Vega RN:** still UNVERIFIED (needs the Vega SDK installed). Fallback: long-poll `GET /events?after=<id>`.
- Latency: <500 ms round trip (certification).

## Spike results (spike/server)
- A stateless `WebStandardStreamableHTTPServerTransport` (per-request server, JSON responses) on Hono with one tool, `bump_counter`, plus `GET /events` SSE with Last-Event-ID resume.
- Local: n=20, p50 2.3 ms, p95 5.2 ms. All 20 tool calls delivered over SSE.
- Through a cloudflared quick tunnel (public internet): **n=20, p50 96.6 ms, p95 131.4 ms**. Well under 500 ms.
