# BTS — RDE Advisors Engineering Test Submission

# ANSWERS

W1.
Scraping: i'd fork https://www.firecrawl.dev/ and calculate the costs of running our own instance of it. This would fix the anti bot issue and it's also great for JS heavy sites since it let's the bot actually interact with the web.
For dedups i don't exactly know what's the quality of the data we get from the scrapper, depending on the structure i can figure out some strategies to find similar records and dedup them.
I have done dedups before so as long as we can find similar properties or at least look for patterns in the listings it should be possible. If not we can default to manual dedup (not ideal but maybe a good approach for demo/v0).
Watermark/logos,etc: If we have the rights to display these images the work is fine, we can set rules, find patterns, use tools to remove sections of images,etc. If we don't i'd have to find out what's the best we can do for this as it becomes more a legal issue rather than tech.

W2. As long as we have set things to be Multi-book, multi-entity by default we shouldn't need a re write down the road. Not doing multi entity support in schemas at first is a great time save but it can also be a pitfall when you need to scale later on.

What's the shortest honest list of features a property-manager-grade accounting system must ship before a customer actually cancels QB (trust accounting per state for security deposits, 1099 e-filing, bank reconciliation, month-end close, CPA-friendly audit trail)?

- Full GL with chart of accounts, journal entries, trial balance, P&L, balance sheet, cash flow
- Trust three-way reconciliation: bank balance = book balance = sum of beneficiary ledgers, monthly, with a report a state examiner would accept
- Immutable audit trail (who, what, when, before/after) exportable as CSV
  Which are regulated enough to be careful about promising in year one?
- Trust accounting compliance

W3. This is usually achieved by doing a custom sub agent, this specialized agent can be smarter than a normal AI API call (since it has defined rules that we set to improve the user experience) e.g. we add to the agent "You are a senior Accountant" seems trivial but as we scale and we need AI to handle things specific to a sub market this is important, more if we want the AI to interact with our own UI, this is something i did in my last contract, the AI was trained to be able to execute things in the UI. For choosing when the AI helps and when it decides for you it depends on the User and what data you are playing with, e.g. would you allow an AI to do a wire transfer without supervition? well it depends on the context, so for this the most important factor is to set the context right for what the AI can do and what it CAN'T (this context should be set specifically for a user/product and it's preferences while using AI).

W4. AI-assisted floor plan designer (hardest product bet). BTS's differentiating feature: tenants upload an existing plan and say "remove these desks, add three enclosed offices," or start blank with "7,000 SF, 70% desks, 30% enclosed, generous lounge, pantry, two phone booths." Which parts are LLM-solvable (intent parsing, critique), which are geometric algorithms (collision detection, space packing, constraint satisfaction), which are UI (drag-drop canvas, snap, export)? What's realistic for v1, what's v2, what's research? If you'd draw a different product line ("don't try auto-layout — let the LLM critique a human-drawn plan"), say so. Where's the over-promising risk?

For this the LLM is really good at 2 things. One, parsing intent (taking "remove these desks, add 3 offices" and turning it into an edit list). Two, critiquing a plan a human already drew (something like "this conference room is next to an elevator, it's going to be loud"). The LLM is not good at actually packing a layout, that's constraint satisfaction and it's been a hard problem since the 70s, asking an LLM to do it is how you blow up your roadmap.

Geometry has to be done the classical way: collision detection, snap to grid, svg boolean ops, and rule-based auto arrangement for a single type of object (a desk grid is fine, mixed-use floorplate is not). UI is cad-lite, drag and drop, ruler, export to svg/dwg.

My bet here runs opposite to what the product deck wants to pitch. I wouldn't try to generate floor plans, instead i'd let the tenant draw something rough and have the LLM critique it like a senior architect would, something like "your pantry has no windows, people will complain" or "65 sf per person on the finance floor won't pass inspection". That's something you can ship in 4-6 weeks and it works every demo. Auto generation from a blank SF target is a 6-12 month research project, and when it's wrong (which will be often at first) the demo dies with it.

Ship the critic first, earn the right to ship the generator later.

W5. Cost control at bootstrap scale. You're running BTS on a tight bootstrap budget. Walk through how you'd keep monthly infra + AI API + third-party costs minimized across year one, assuming 10K monthly searches scaling to 100K. Give specific numbers where you can — model routing thresholds (Haiku for classification, Sonnet for synthesis), prompt caching TTL and hit-rate targets, Supabase tier ceilings, Vercel bandwidth math, when you'd self-host vs. stay managed, RAG chunk size trade-offs.

For bootstrap i'd start with the defaults we already have. Haiku 4.5 for anything parse/classify (under 500 output tokens, which is 99% of our calls). Sonnet 4.6 only for synthesis stuff, like broker-facing market summaries or multi-listing comparisons. At 10k i don't think we'd touch sonnet once.

Prompt caching is the biggest lever. Our system prompt is ~350 tokens and it doesn't change across calls. Anthropic has a 5 min ephemeral TTL that fits NYC business hour traffic, target 70%+ hit rate and input cost drops to 10% of normal. It's a one liner in src/lib/ai.ts.

Bandwidth isn't really a problem. Vercel Pro includes 1 TB and our flow is ~1.5 MB per search, so we cover ~600k searches/month before we pay anything for overage.

Supabase free tier is enough for 10k searches if we keep the sessions table lean. Pro is $25/mo and takes us through 50k. On free the row-read ceiling is around 500k/mo, that's the kind of cliff you hit during a spike and only notice monday morning.

For RAG, chunks of 400-600 tokens. Smaller loses context, bigger wastes retrieval budget. 548 buildings × 1 chunk each is trivial, we can stay on pgvector inside supabase and not move to a hosted vector db until we're 10× bigger.

Stay managed until total Vercel spend is around $500/mo or we hit 100k MAU. Engineering time costs more than infra at this stage.

Three Claude API cost traps i've watched play out:

1. max_tokens left at the SDK default. I've seen it land at 4096 when the code needed 300. One misconfig and a $50 line becomes $500 overnight. Always set it explicitly in the wrapper.

2. Stream retries that resend the whole prompt on any mid-stream error. If the API hiccups and the retry is naive you pay for input twice per failure. Instrument retry telemetry from day one, a retry loop running unnoticed for an hour is eye opening the first time.

3. Logging full request bodies to Datadog or Axiom. At 50k-token RAG contexts log ingest can exceed the API spend on a chatty endpoint. Truncate req.body before it leaves the function.

Table below for the actual projected monthly spend.

## W5 — Cost projection

One-page monthly cost projection for BTS at 10K / 50K / 100K searches, based on the stack actually shipped in this repo (Vercel Pro + AI Gateway → Claude Haiku 4.5, one `generateObject` per search with `cacheTag`-based dedup, 25 static listings served from `/public`, no database).

### Assumptions

| Variable                  | Value                                              | Source / note                                                                       |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| LLM model                 | `anthropic/claude-haiku-4.5` via Vercel AI Gateway | `src/lib/ai.ts:32`                                                                  |
| Tokens per call           | ~400 input / ~150 output                           | Measured against our prompt in `src/lib/ai.ts:28-42`                                |
| Anthropic pricing         | $1.00 / MTok input, $5.00 / MTok output            | Haiku 4.5 public rates                                                              |
| AI Gateway margin         | +5%                                                | Standard Vercel pass-through                                                        |
| `cacheTag` hit rate       | 20% / 30% / 40%                                    | Grows with traffic — chip queries and common submarket terms dominate the long tail |
| Bandwidth per search flow | ~1.5 MB                                            | Search page + ~30% detail-view click-through                                        |
| Hosting                   | Vercel Pro                                         | $20/mo base, 1 TB bandwidth included, Fluid Compute invocations free through 1 M/mo |
| Image strategy            | Static SVGs committed to `/public`                 | Zero Blob / Image Optimization cost                                                 |
| Prompt caching            | Not enabled (baseline)                             | Would drop ~30% off the LLM line with a one-line config change                      |

**Per-call raw cost:** `(400 × $1 + 150 × $5) / 1M × 1.05` = **$0.00121 per billable search**

### Monthly projection

| Line item                                 |    10K searches |    50K searches |    100K searches |
| ----------------------------------------- | --------------: | --------------: | ---------------: |
| **LLM (AI Gateway → Haiku 4.5)**          |                 |                 |                  |
| Billable calls (after cache)              |           8,000 |          35,000 |           60,000 |
| LLM cost                                  |           $9.68 |          $42.35 |           $72.60 |
| **Vercel platform**                       |                 |                 |                  |
| Pro plan base                             |          $20.00 |          $20.00 |           $20.00 |
| Fluid Compute (Active CPU + memory)       |          ~$1.00 |          ~$5.00 |          ~$12.00 |
| Bandwidth                                 | 15 GB _(incl.)_ | 75 GB _(incl.)_ | 150 GB _(incl.)_ |
| Vercel Blob / Image Optimization          |              $0 |              $0 |               $0 |
| **Observability**                         |                 |                 |                  |
| Web Analytics / Speed Insights            |          $10.00 |          $10.00 |           $10.00 |
| Sentry (free tier)                        |              $0 |              $0 |               $0 |
| **Domain** (amortized $15/yr)             |           $1.25 |           $1.25 |            $1.25 |
| **Misc buffer** (logs, transfer overages) |           $5.00 |          $10.00 |           $20.00 |
| **TOTAL**                                 |   **~$47 / mo** |   **~$89 / mo** |   **~$136 / mo** |
| **Cost per search**                       |     **$0.0047** |     **$0.0018** |     **$0.00136** |

### What scales and why

- **LLM dominates at 100K** — ~53% of the bill. Highest-leverage optimization: enable **Anthropic prompt caching** for the ~350-token system + submarket preamble. Cache hits drop input cost 90%, realistically shaving ~$25/mo at 100K. Our `src/lib/ai.ts` wrapper is one config change away.
- **Bandwidth stays free through 100K** — Vercel Pro includes 1 TB. First real pressure point is around 600K searches/mo, after which overage is $0.15/GB.
- **Fluid Compute scales sub-linearly** vs. classic serverless because Fluid reuses instances across concurrent requests during the LLM wait. Migrating to traditional Lambdas would roughly 3× the compute line at 100K.
- **Step change around ~250K/mo.** Either move to Anthropic direct (drops the Gateway 5% margin) or negotiate Gateway enterprise pricing — the optimal path depends on whether the observability and failover the Gateway provides are worth the markup at that point.
- **Cut levers if we need $30/mo at 10K scale:** downgrade Pro → Hobby (-$20, loses team features), skip Analytics (-$10), enable prompt caching (-$3). Gets us to ~$15/mo all-in.

**Headline:** at 100K monthly searches, BTS runs at roughly **$0.0014 per search** — the marginal cost of one AI-powered office search is well under half a penny.
