# Tool latency (live)

Measured 2026-10-11T18:19:05.107Z from a laptop in Chicago against `https://koothznswwvs4koyux64x4bs3e0msbsb.lambda-url.us-east-1.on.aws` (AWS us-east-1, Lambda arm64 1024 MB, DynamoDB on-demand), MCP Streamable HTTP, round trip as seen by the client.
Reproduce: `npm --prefix apps/server run latency -- <serverUrl> 20`.

**Overall: 200 calls, p50 71 ms, p95 101 ms, max 170 ms.** Alexa+ certification budget: 500 ms round trip.

| Tool | Calls | p50 ms | p95 ms | max ms | p95 < 500 ms |
|---|---|---|---|---|---|
| `get_household` | 20 | 55 | 65 | 65 | ✅ |
| `get_plan` | 20 | 55 | 130 | 130 | ✅ |
| `set_dinner` | 20 | 84 | 170 | 170 | ✅ |
| `whos_on` | 20 | 58 | 93 | 93 | ✅ |
| `chore_balance` | 20 | 54 | 75 | 75 | ✅ |
| `start_cooking` | 20 | 82 | 112 | 112 | ✅ |
| `next_step` | 20 | 78 | 131 | 131 | ✅ |
| `start_timer` | 20 | 75 | 84 | 84 | ✅ |
| `shopping_list` | 20 | 82 | 154 | 154 | ✅ |
| `list_pantry` | 20 | 55 | 68 | 68 | ✅ |

Notes: excludes `plan_week` (enqueue only; the Bedrock call runs in the SQS worker). A cold start measured ~1.1 s before the 5-minute EventBridge warm-up rule was added.
