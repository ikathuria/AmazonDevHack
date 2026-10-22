# Tool latency (live)

Measured 2026-10-22T15:36:12.121Z from a laptop in Chicago against `https://koothznswwvs4koyux64x4bs3e0msbsb.lambda-url.us-east-1.on.aws` (AWS us-east-1, Lambda arm64 1024 MB, DynamoDB on-demand), MCP Streamable HTTP, round trip as seen by the client.
Reproduce: `npm --prefix apps/server run latency -- <serverUrl> 20`.

**Overall: 200 calls, p50 71 ms, p95 105 ms, max 206 ms.** Alexa+ certification budget: 500 ms round trip.

| Tool | Calls | p50 ms | p95 ms | max ms | p95 < 500 ms |
|---|---|---|---|---|---|
| `get_household` | 20 | 58 | 77 | 77 | ✅ |
| `get_plan` | 20 | 57 | 135 | 135 | ✅ |
| `set_dinner` | 20 | 88 | 197 | 197 | ✅ |
| `whos_on` | 20 | 60 | 71 | 71 | ✅ |
| `chore_balance` | 20 | 62 | 72 | 72 | ✅ |
| `start_cooking` | 20 | 80 | 206 | 206 | ✅ |
| `next_step` | 20 | 79 | 158 | 158 | ✅ |
| `start_timer` | 20 | 76 | 100 | 100 | ✅ |
| `shopping_list` | 20 | 86 | 105 | 105 | ✅ |
| `list_pantry` | 20 | 56 | 68 | 68 | ✅ |

Notes: excludes `plan_week` (enqueue only; the Bedrock call runs in the SQS worker). A cold start measured ~1.1 s before the 5-minute EventBridge warm-up rule was added.
