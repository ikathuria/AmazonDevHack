# Tool-selection eval results

Run 2026-10-11T20:57:47.291Z · model `us.anthropic.claude-haiku-4-5-20251001-v1:0` acting as the Alexa+ client · 22 Homebase tools · dry run (write tools not executed).
Reproduce: `npm --prefix apps/server run eval`. Requests: [`eval/requests.json`](requests.json) · written by: agent (Claude Code), reviewed by: (pending).

**Right tool: 37/40. Right tool and arguments: 37/40.**

| id | Request | Expected | Chosen (args) | Tool | Tool + args |
|---|---|---|---|---|---|
| m-01 | what are we eating tonight | `get_plan` | `get_plan` `{"day":"today"}` | ✅ | ✅ |
| m-02 | ugh I have no idea what to cook this week, can you sort it out | `plan_week` | `plan_week` `{}` | ✅ | ✅ |
| m-03 | figure out dinners for the week but keep wednesday super quick, we have soccer | `plan_week` | `plan_week` `{"request":"quick meals on Wednesday for soccer"}` | ✅ | ✅ |
| m-04 | what's the plan for friday | `get_plan` | `get_plan` `{"day":"Friday"}` | ✅ | ✅ |
| m-05 | read me the whole week | `get_plan` | `get_plan` `{"day":"week"}` | ✅ | ✅ |
| m-06 | can we do the dal on thursday instead | `set_dinner` | `set_dinner` `{"day":"thursday","recipe":"dal"}` | ✅ | ✅ |
| m-07 | put peanut noodles on saturday | `set_dinner` | `set_dinner` `{"day":"Saturday","recipe":"peanut noodles"}` | ✅ | ✅ |
| m-08 | what are we having tomorrow night? | `get_plan` | `get_plan` `{"day":"tomorrow"}` | ✅ | ✅ |
| h-01 | heads up, Maya can't have sesame anymore, the doctor said so | `update_member_preferences` | `update_member_preferences` `{"member":"Maya","addAllergies":["sesame"]}` | ✅ | ✅ |
| h-02 | Arjun's gone vegetarian | `update_member_preferences` | `update_member_preferences` `{"member":"Arjun","addDiets":["vegetarian"]}` | ✅ | ✅ |
| h-03 | Priya hates olives, don't give her olives | `update_member_preferences` | `update_member_preferences` `{"member":"Priya","addDislikes":["olives"]}` | ✅ | ✅ |
| h-04 | who's allergic to what in this house again? | `get_household` | `get_household` `{}` | ✅ | ✅ |
| h-05 | what do you know about our family | `get_household` | `get_household` `{}` | ✅ | ✅ |
| h-06 | good news, Maya grew out of her peanut allergy | `update_member_preferences` | `update_member_preferences` `{"member":"Maya","removeAllergies":["peanut"]}` | ✅ | ✅ |
| c-01 | whose turn is it to do the dishes | `whos_on` | `whos_on` `{"chore":"dishes","day":"today"}` | ✅ | ✅ |
| c-02 | make a chore chart for the week, and make it fair this time | `assign_chores` | `assign_chores` `{}` | ✅ | ✅ |
| c-03 | what does Maya have to do today | `whos_on` | `whos_on` `{"member":"Maya","day":"today"}` | ✅ | ✅ |
| c-04 | trash is out | `mark_chore_done` | `mark_chore_done` `{"chore":"trash"}` | ✅ | ✅ |
| c-05 | I feel like I'm doing all the housework, is that true? | `chore_balance` | `chore_balance` `{}` | ✅ | ✅ |
| c-06 | who's cooking on saturday | `whos_on` | `whos_on` `{"chore":"cooking","day":"Saturday"}` | ✅ | ✅ |
| c-07 | dishes done! | `mark_chore_done` | `mark_chore_done` `{"chore":"dishes"}` | ✅ | ✅ |
| c-08 | redo the rota, Arjun's travelling | `assign_chores` | `assign_chores` `{}` | ✅ | ✅ |
| k-01 | ok let's make dinner | `start_cooking` | `get_plan` `{"day":"today"}` | ❌ | ❌ |
| k-02 | walk me through the chana masala | `start_cooking` | `start_cooking` `{"recipe":"chana masala"}` | ✅ | ✅ |
| k-03 | done, what now | `next_step` | `next_step` `{}` | ✅ | ✅ |
| k-04 | wait, go back one | `previous_step` | `previous_step` `{}` | ✅ | ✅ |
| k-05 | sorry, say that again? | `repeat_step` | `(none)`  | ❌ | ❌ |
| k-06 | set a timer for twelve minutes | `start_timer` | `start_timer` `{"minutes":12}` | ✅ | ✅ |
| k-07 | start the timer for this step | `start_timer` | `start_timer` `{}` | ✅ | ✅ |
| k-08 | next | `next_step` | `(none)`  | ❌ | ❌ |
| s-01 | what do I need to grab at the store | `shopping_list` | `shopping_list` `{}` | ✅ | ✅ |
| s-02 | we're out of milk, add it to the list | `add_to_list` | `add_to_list` `{"items":["milk"]}` | ✅ | ✅ |
| s-03 | got the cilantro and the eggs | `check_off` | `check_off` `{"items":["cilantro","eggs"]}` | ✅ | ✅ |
| s-04 | toss bananas on the grocery list | `add_to_list` | `add_to_list` `{"items":["bananas"]}` | ✅ | ✅ |
| p-01 | do we have any rice left | `list_pantry` | `list_pantry` `{"ingredient":"rice"}` | ✅ | ✅ |
| p-02 | I just bought chicken thighs and yogurt | `add_pantry_items` | `add_pantry_items` `{"items":["chicken thighs","yogurt"]}` | ✅ | ✅ |
| p-03 | used up the last of the lentils | `remove_pantry_items` | `remove_pantry_items` `{"items":["lentils"]}` | ✅ | ✅ |
| p-04 | what's in the pantry | `list_pantry` | `list_pantry` `{}` | ✅ | ✅ |
| d-01 | can I get a copy of all my homebase data | `export_household` | `export_household` `{}` | ✅ | ✅ |
| d-02 | delete everything homebase knows about us | `delete_household_data` | `(none)`  | ✅ | ✅ |
