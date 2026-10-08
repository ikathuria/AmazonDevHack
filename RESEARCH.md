# Hearth (working name; must rename) — Research Report

> Mode: deep (multi-agent: competitor, community, video, news/trends, feasibility) · Researched: 2026-10-08 · By: idea-research skill
> Context: hackathon entry first (see HACKATHON_PLAN.md); this report judges it **as a product beyond the hackathon**.

---

## Verdict

| | |
|---|---|
| **Build it?** | **weekend-prototype-first.** The hackathon *is* the prototype. Do not plan a product until it shows households keep using it. |
| **Market** | crowded-with-gap. Alexa+, Cozi, Skylight and meal apps cover meals and cook-along. The open gap is **a shared household memory + fair chore rota + a shared TV surface**, driven by voice |
| **Demand** | moderate. Meal-planning pain recurs 2018–2026 ("Planning our family dinners is a significant friction point in our lives", HN). Chore-fairness pain is real but milder. No willingness-to-pay found for a voice/TV version |
| **Direction** | tailwind (moderate). Alexa+ adopted MCP add-ons + MCP Apps in July 2026; family-logistics AI startups raised pre-seed in Sept 2026. Point meal apps are consolidating (Mealime closes 2026-10-21) |
| **Feasibility** | medium-to-hard. The spike is Alexa+ add-on → our backend → a Vega app on Fire TV. Alexa+ documents no Fire TV rendering target, so the TV app must subscribe to our backend |
| **Free to build** | mostly. About $1–5/mo at small scale (LLM tokens ≈ $0.001–0.03 per weekly plan + an OAuth server). AWS free plan credits expire after 6 months |
| **Monetization** | Not yet. Alexa+ add-on monetization terms weren't found, and the Alexa skill revenue history is poor. If it ever earns: freemium household subscription anchored to Cozi Gold $39/yr and Skylight Plus $39–79/yr |

**In two sentences:** Amazon's own Alexa+ already does weekly meal plans, dietary adaptation and Echo Show cook-along, and the add-on ecosystem has no proven way to monetize. As a standalone product this fails the "free good-enough incumbent" test unless it leans hard into what Alexa+ doesn't do: persistent household memory, fair chore splitting, and a shared family screen on the TV. Build it for the hackathon (strong fit there), and decide on a product only after real households use it.

---

## Competitors

| Name | Pricing | Strength | Limitations | User complaints | Activity |
|---|---|---|---|---|---|
| **Alexa+ (native)** | Free w/ Prime; $19.99/mo otherwise | Weekly meal plans, recipe adaptation to diets, Echo Show step-by-step + timers, list → Fresh cart | No chore rota or pantry found (absence, weak); slow/buggy per HN | "Alexa Plus sucks. It takes way too long to respond…" (HN, 2026-03) | Very active |
| **Skylight** (Calendar/Cap) | $160–600 hardware + Plus ~$39–79/yr | Physical kitchen hub; chores, calendar; meal planning behind Plus | Hardware cost; paywalled meals | "why it costs $300 for something a $10 paper calendar can do?" (via SEO site) | Active; reported price rise (weak) |
| **Hearth Display** | $9/mo + 27" display | Family wall hub: calendar, meals, routines, chores | Expensive hardware | not gathered | Funded ($4.6M 2023; $5.5M 2025, moderate). **Name collision** |
| **Cozi** | Free w/ ads; Gold $39/yr | Cheapest all-in-one: calendar, lists, meals, recipes | 30-day history on free tier; ads | Trustpilot 2.5/5 (13 reviews) | Owned by OurFamilyWizard since 2022 |
| **Meal specialists** (Mealime, Plan to Eat, Samsung Food) | ~$25–60/yr | Recipes → plan → list | No household chores, no voice-first | n/a | **Mealime closes 2026-10-21**; Yummly closed 2024-12 |
| **Mealie / Tandoor** (OSS) | Free self-host | Recipes + plans; Home Assistant voice | No Alexa | n/a | Active |

**Positioning:** the wedge is *not* "meal planning on Alexa" (Amazon owns that). It's **"the household's shared memory and fair rota"**: who's allergic to what, who did dishes last, what's in the pantry. It persists across sessions and shows on the one screen the whole family already looks at. Cook-along on TV is a demo feature, not the moat.

---

## What users actually say

> "Planning our family dinners is a significant friction point in our lives" — https://news.ycombinator.com/item?id=18484164 (2018)
> "planning a meal every night of the week is nearly impossible." — https://news.ycombinator.com/item?id=38132644 (2023)
> "My partner and I spend about three hours per week on meal planning and prep for our family" — https://news.ycombinator.com/item?id=32279022 (2022)
> "Meal planning is more of a negotiation than a tallying of numbers." — https://news.ycombinator.com/item?id=42128711 (2024)
> "It keeps chores more fair and balanced between my wife and I." — https://news.ycombinator.com/item?id=37760115 (2023)
> "an app doesn't actually make the process any easier, it complicates it." — https://news.ycombinator.com/item?id=49289049 (2026-08, counter-signal)
> "Alexa Plus sucks. It takes way too long to respond even when given simple commands." — https://news.ycombinator.com/item?id=47231276 (2026-03)
> "it's buggier than regular Alexa" — https://news.ycombinator.com/item?id=47227523 (2026-03)

**DIY workarounds found:** paper/index card on the fridge, ChatGPT for planning + grocery delivery, self-built family intranets (HN 2026), chore apps like Tody.
**Demand-strength read:** recurring and recent for meal planning; mild-to-moderate intensity. Unproven for voice/TV or for paying. Echo Show owners reportedly use it "as a timer" mostly (Reddit mirror, weak).

---

## Demand signals

**Video (YouTube):** unassessable. The tools couldn't reach YouTube metadata; check manually.
**Search interest:** no data (Google Trends blocked, HTTP 429). Market-research reports claim 14–25% CAGR for AI meal planning (weak, conflicting).
**News & momentum:**
- Alexa+ formally adopted MCP for add-ons in **July 2026**, including MCP Apps UIs. A smart-home preview launched 2026-07-23 (strong).
- Fambot ($3.5M) and Orbits ($2.6M) raised pre-seed for AI family logistics in **Sept 2026** (moderate).
- Google Gemini for Home shipped June 2026; an Apple home display is rumored. The household assistant war is heating up.
- Vega OS is limited to newer Fire TV Sticks; Fire OS 16 continues on other hardware, so the target is fragmented.

---

## Feasibility

- **The spike:** Alexa+ add-on → our backend → Fire TV Vega app in real time. **Approach:** the Vega app subscribes to our backend via **SSE** (cheaper and simpler than API Gateway WebSocket, whose free tier lasts only 12 months); Alexa tool calls only write state. Alexa+ MCP Apps render in the conversation view (mobile, Echo Show 8/15, voice), not on a third-party Fire TV app.
- **Platform facts:** MCP spec 2025-11-25, Streamable HTTP, **US-only**. Deploy via `alexa-ai deploy` to the development stage + web simulator. **<500 ms round trip is a certification requirement.** Auth is two-tier: Tier 1 is client_credentials; **Tier 2 (authorization_code + PKCE, e.g. Cognito) is triggered for user-specific tools**. Hearth's household tools are user-specific, so plan on account linking. Unauthenticated dev-stage use is unconfirmed.
- **Vega:** runs on the Fire TV Stick 4K Select (RN 0.72/0.83); sideload only to registered developer devices via USB/CLI. WebSocket/SSE support on Vega RN is unverified.
- **Cost audit:**

| Service | Free tier | Over limit | Note |
|---|---|---|---|
| AWS Free plan | ≤$200 credits, 6 months | account closes at 6 mo or when credits run out | plan migration later |
| Lambda | 1M req + 400k GB-s/mo | $0.20/M req | provisioned concurrency not free |
| DynamoDB on-demand | 25 GB storage | $0.625/M writes, $0.125/M reads | pennies |
| API Gateway WebSocket | 12 months only | $1/M msgs | **use SSE instead** |
| Claude (Haiku 5.5 / Sonnet 5.5 first-party) | — | $0.10/$0.50 and $2/$10 per MTok | ≈ $0.0013–0.026 per weekly plan; Bedrock rates unverified (+10% regional) |
| Recipe data | TheMealDB free; Spoonacular 50–150 pts/day | commercial terms unconfirmed | **no clean commercial path**; LLM recipes need allergy verification |
| Alexa / Amazon developer accounts | free | — | |
| Cognito (OAuth) | not fetched | — | or self-hosted OAuth |

- **Prior-art failures:** Amazon ended Alexa Developer Rewards (2024-07), removed Amazon Pay for skills and the Routines Kit (2026-05). AnyList's Alexa integration has been broken since March 2026. Yummly shut down (2024-12) and users lost recipes with no export. Lesson: third-party voice add-ons are at the platform's mercy, so keep the data portable and the TV/web surface independent.
- **Classification:** medium-to-hard. Milestone 0 must prove: (1) the echo add-on is deployed and callable from the simulator; (2) a tool write reaches the Vega app via SSE; (3) <500 ms round trip; (4) whether account linking is mandatory at dev stage.

---

## Monetization

Not recommended yet. There are no known Alexa+ add-on payment terms, and Alexa skill monetization history is poor. If usage proves out, the simplest path is a **household subscription (~$3/mo or $29/yr)**, sold on a companion web/TV surface rather than inside Alexa. That undercuts Cozi Gold ($39) and Skylight Plus ($39–79). The free tier must cap LLM plan generations, though at <$0.03/plan cost isn't the constraint; acquisition is.

---

## Conflicts & unknowns

- **Alexa+ overlap vs gap:** the competitor agent found Alexa+ natively does meal plans and cook-along (Amazon marketing, moderate). No chore/pantry feature was found, but that's absence of evidence. Hands-on testing with your Prime account would settle what's actually missing.
- **Alexa+ quality:** Amazon claims rich features; HN users (2026-03) call it slow and buggy. This is the riskiest dependency for both product and demo.
- **500 ms:** a certification requirement, not a documented hard timeout. Treat it as a hard budget anyway.
- **Fire TV as a kitchen screen:** no evidence either way that families can see their TV while cooking. This is a core premise to test with real households. Echo Show 15 may be the better "kitchen" surface, and the Fire TV the "family board".
- **Name:** "Hearth" collides with Hearth Display, a funded family hub with meal planning and chores. **Rename.**
- **Vega fragmentation:** Vega only on newer sticks; check the team's Fire TV model.
- **Thin evidence:** Reddit was blocked (403) and YouTube was unreachable, so demand evidence is HN-heavy and skews technical.

## Could not access

- Reddit (reddit-mcp-buddy returned 403; site:reddit.com searches returned nothing usable). Only one mirror snippet.
- YouTube search and results pages (no metadata).
- Google Trends (HTTP 429); Exploding Topics not reached.
- Vendor pricing pages for Skylight, Cozi, Mealime, Plan to Eat, Samsung Food (secondary sources used); Spoonacular terms; Cognito and Bedrock Claude pricing (truncated).
- Alexa+ dev-stage, certification, rate-limit and account-linking detail pages (search summaries only); Vega SDK detail pages and GitHub samples.
