# Zombie Tracker

Mobile-first investigative dashboard for the **AI For Accountability Hackathon — Apr 29, 2026**.

Surfaces Canadian organizations that received large amounts of public funding then ceased meaningful operations. Tap a card → AI-streamed forensic dossier.

## What's wired up tonight

- ✅ Next.js 15 + Tailwind, dark mobile-first UI
- ✅ Live Postgres connection (read-only hackathon DB)
- ✅ `getZombies()` — ranked list using `general.vw_entity_funding` × `cra.govt_funding_by_charity` × `ab.ab_non_profit`
- ✅ `getTotalFundingLost()` — header ticker number
- ✅ `getDossier()` — top FED + AB grants, funding-by-year, last-filed CRA financials
- ✅ `/api/zombies/[id]/narrative` — streaming SSE endpoint that calls Claude Sonnet 4.6 with structured data
- ✅ Mobile feed (HeaderTicker, FilterChips, ZombieCard, DossierSheet) with framer-motion bottom-sheet
- ✅ In-memory caching (5–10 min) so the feed stays snappy

## First-time setup (do tonight)

```bash
cd /Users/saidzaripov/Documents/GovHackathon/zombie-tracker
npm install
```

Then **paste your Anthropic key** into `.env.local`:

```
ANTHROPIC_API_KEY="sk-ant-..."
```

Then:

```bash
npm run dev
```

Open http://localhost:3000 — the feed should populate with real zombies from the live DB. Tap a card → dossier opens → AI narrative streams in.

## Tomorrow morning checklist (in priority order)

The scaffold runs end-to-end. The hour-1 work is **refining the zombie definition** so the top results are defensible in front of judges.

### 1. Tighten the AB-status name match (10 min)
Right now `lib/queries.ts` joins `ab.ab_non_profit.legal_name` to `entity_golden_records.canonical_name` with `UPPER()`. That produces some false positives (a Saskatoon hospital matched to an Alberta org with a similar name).

**Fix options:**
- Require BN match where available — join on `bn_root` first, fall back to name only when no BN
- Or restrict to entities whose `dataset_sources` array contains `'ab'`
- Or use `general.entity_source_links` with `source_table = 'ab_non_profit'`

The cleanest path is the third — there are 69,271 such links already in the entity-resolution pipeline output.

### 2. Sanity-check the top 10 (15 min)
Skim the top 10 results manually. Drop any that are obvious false positives (still active, still funded, large active hospitals). Adjust the SQL to exclude them — usually a one-line filter on `entity_type` or `cra_latest_year >= 2024`.

### 3. Polish the AI prompt (15 min)
The current prompt in `lib/anthropic.ts` is OK but generic. To make the demo *pop*:
- Add 2–3 few-shot examples of great forensic narratives (CBC-style)
- Emphasize: lead with the dollar amount, name the department by name, end with one sharp sentence
- Add a constraint: if `total_funding > 1B`, treat as a major hospital/foundation — likely a false-positive zombie. Output a "this entity may be misclassified" note instead.

### 4. Pre-pick 3 zombies for the live demo (10 min)
Find three that tell distinct, compelling stories:
- One **Federal-only** zombie — got a big federal grant, then disappeared
- One **Alberta dissolved** non-profit
- One **CRA charity that stopped filing** with high public-revenue dependency

Bookmark their entity IDs. Open them once each before the pitch so the dossier panels are warm-cached.

### 5. Deploy to Vercel (10 min)
```bash
npx vercel --prod
```
Set env vars in the Vercel dashboard:
- `DATABASE_URL` (from `.env.example`)
- `ANTHROPIC_API_KEY` (your key, or the org Microsoft/Bedrock key once distributed — see swap note below)
- `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`)

Test the deployed URL on your phone before the demo.

### 6. (Optional) Swap to org-provided LLM keys (15 min)
If the hackathon distributes Microsoft/Bedrock keys at 9 AM and you'd prefer to use those:
- For **Bedrock**: `@anthropic-ai/bedrock-sdk` instead of `@anthropic-ai/sdk`. Same `messages.stream` API.
- For **Microsoft Azure OpenAI**: switch to the Azure SDK, replace the streaming loop. Keep the system/user prompts as-is.

Don't bother unless you hit rate limits on your personal key.

### 7. (Optional, if time) Polish moves
- Dollar number on the header ticker — round to billions, e.g. "$12.2B"
- Add a "Share" button per dossier (Web Share API on mobile, copy-link fallback)
- Sparkline of funding-by-year on each card
- Tap a chip more times to cycle: All → Federal → Alberta → AB-dissolved-only

## Demo pitch outline (5 min)

1. **Hook (30s)** — open the live URL on a phone. Show the ticker: *"$12.2B in Canadian public dollars went to organizations that no longer meaningfully operate."*
2. **Scroll the feed (60s)** — the top 5 cards. Pause on a striking one.
3. **Tap to open the dossier (90s)** — let the audience watch the AI narrative stream in. This is the wow moment. Stay quiet.
4. **Tap one Federal-only and one Alberta-dissolved (60s)** — show this works across all three governments, not just one dataset.
5. **Close (60s)** — what's next: real-time monitoring, journalist alerts, citizen FOI tooling. Built on 23M open-data rows. Ship to the public after the hackathon.

## Architecture (1 paragraph)

Single Next.js 15 app. Server-side queries to the hackathon Postgres via `pg`. The zombie definition is one SQL query against `general.vw_entity_funding` joined to `cra.govt_funding_by_charity` (for the public-revenue-share signal) and `ab.ab_non_profit` (for the dissolved/struck signal). Per-entity dossier joins through `general.entity_source_links` to pull top FED + AB grants. The narrative endpoint streams Claude Sonnet 4.6 over SSE, feeding the model only the structured JSON for the entity (no free-text retrieval — narrows hallucination risk). Frontend is one page: sticky header ticker, sticky filter chips, vertical card feed, framer-motion bottom-sheet dossier.

## Files

```
app/
  page.tsx                                 entry
  layout.tsx                               root layout
  globals.css
  components/
    HeaderTicker.tsx                       animated $ counter
    FilterChips.tsx                        source × province × min-funding
    ZombieFeed.tsx                         feed orchestration
    ZombieCard.tsx                         single card
    DossierSheet.tsx                       bottom-sheet dossier with streaming AI
  lib-client/format.ts
  api/
    totals/route.ts                        ticker number
    zombies/route.ts                       feed list (cached)
    zombies/[id]/dossier/route.ts          structured per-entity data
    zombies/[id]/narrative/route.ts        SSE stream from Anthropic
lib/
  db.ts                                    pg pool
  cache.ts                                 in-memory cache
  queries.ts                               zombie SQL + dossier SQL
  anthropic.ts                             SDK + system prompt
  types.ts
```

## Known limitations (refine in the morning)

- **AB name-match false positives** — see fix #1 above
- **`vw_entity_funding` query is ~10s on first hit** — cached for 5 min after that, but Vercel cold starts will pay the cost. Acceptable for a demo if you warm the cache by tapping a few zombies before pitching.
- **No revocation date in the data** — "stopped filing" is inferred from `cra_latest_year <= 2022`. The CRA dataset only covers 2020–2024.
- **Top entity (#1) is likely a false positive** — fix #1 should resolve it; until then maybe skip past it in the demo.
