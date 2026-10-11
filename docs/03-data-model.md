# 03 — Data model (DynamoDB single table)

One table, on-demand billing, keyed by household. Every item is `{ pk, sk, doc, ttl? }`, and `doc` is validated by `packages/contracts` (zod) at the edges. Code: `apps/server/src/lib/store.ts` (`DynamoStore`, plus `MemoryStore` for local dev and tests with identical behavior).

| pk | sk | doc | Written by | Read by |
|---|---|---|---|---|
| `HH#<id>` | `PROFILE` | `Household` (members, allergies, diets, dislikes, dayRules, timezone) | seed, `update_member_preferences` | almost every tool, planner |
| `HH#<id>` | `PANTRY` | `PantryItem[]` | seed, `add_pantry_items`, `remove_pantry_items`, `check_off` | `list_pantry`, planner, `shopping_list`, `start_cooking` |
| `HH#<id>` | `CHORES` | `Chore[]` (name, effort 1–5, daily/weekly) | seed | chore tools |
| `HH#<id>` | `CHORE_STATE` | `{ weekOf, assignments: ChoreAssignment[], history: {memberId: effortPoints} }` | `assign_chores`, `mark_chore_done` | `whos_on`, `chore_balance`, `/state` |
| `HH#<id>` | `RECIPE#<recipeId>` | `Recipe` (ingredients with allergen tags, steps with optional timerSec) | seed, planner (verified new recipes only) | meal, cook and shopping tools |
| `HH#<id>` | `PLAN` | `MealPlan` (weekOf, status drafting/ready/failed, days, blocked[]) | `plan_week` (drafting), worker (ready/failed), `set_dinner` | `get_plan`, `start_cooking`, `shopping_list`, `/state` |
| `HH#<id>` | `COOK` | `CookSession` (recipeId, stepIndex, timerEndsAt) | cook tools | cook tools, `/state` |
| `HH#<id>` | `SHOPPING` | `ShoppingItem[]` | `shopping_list`, `add_to_list`, `check_off` | same + `/state` |
| `HH#<id>` | `META` | `{ seq: number }`: atomic event counter (`ADD seq 1`) | `appendEvent` | `appendEvent` |
| `HH#<id>` | `EVT#<seq, 10-digit zero-padded>` | `StoredEvent` `{ seq, at, event: HomebaseEvent }`, `ttl` = 7 days | every write tool + worker | SSE feed (`/households/:id/events`), `/state` (lastSeq) |

## Access patterns (all single-partition)

| Pattern | Operation | Covered by |
|---|---|---|
| Read one household doc | `GetItem(pk, sk)` | tool tests, `demo-journey.test.ts` |
| List recipes | `Query(pk, begins_with(sk, "RECIPE#"))` | `seed-data.test.ts`, planner tests |
| Append a TV event | `UpdateItem META ADD seq` → `PutItem EVT#seq` | `app.test.ts` (SSE), `demo-journey.test.ts` |
| Events after a cursor (SSE resume) | `Query(pk, sk BETWEEN EVT#seq+1 AND EVT#max)` | `app.test.ts` (Last-Event-ID) |
| Export a household | the reads above, combined | `data-tools.test.ts` |
| Delete a household | `Query(pk)` keys only → `BatchWrite` deletes, paginated | `data-tools.test.ts` |

## Versioning without migrations

Docs are whole JSON values parsed through zod schemas with defaults, so adding an optional field never needs a migration: old items parse and pick up the default. A breaking change adds a `v` field to the affected doc and a read-time upgrade in `docs.ts`. There are no breaking changes yet.

## Retention & privacy

- Events expire after 7 days (DynamoDB TTL); the TV only needs recent history to resume.
- `export_household` returns everything as `homebase-export-v1` JSON. `delete_household_data` removes every item for the household (refused for the public demo household via `PROTECTED_HOUSEHOLDS`).
- No content leaves the table except Bedrock planning prompts (household summary, pantry, recipe titles), which are not stored by the worker.
