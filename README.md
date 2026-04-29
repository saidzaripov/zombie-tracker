# 🧟 Zombie Tracker

**A mobile-first investigative dashboard surfacing Canadian organizations that received public funding and ceased meaningful operations.**

Tap any name. An AI investigator generates a forensic dossier in real time, citing only the numbers and dates from the open data — no hallucination, no opinion.

> **Live demo: [zombie-tracker.vercel.app](https://zombie-tracker.vercel.app)** — open it on your phone.
>
> Built solo for the [Agency 2026 — Ottawa AI Hackathon](https://www.agency2026.ca/) (April 29, 2026), in the *AI for Accountability* track.

---

## What it shows

> **$1.5 billion** in Canadian public funding went to charities and non-profits that received over $100K in federal or Alberta grants and have either had their non-profit registration dissolved, stopped filing their CRA T3010 charity return, or showed near-total dependence on government revenue while reporting silently lapsed.

The headline ticker animates on page load. Below it, a scrollable feed of every flagged organization — ranked by total public dollars received, filterable by funding source, province, and threshold. Tap a card and an AI dossier streams in with:

- A 3-paragraph forensic narrative (CBC-style) citing every dollar, date, and department name that appears in the source data.
- Top grants with values, payment dates, granting departments, and program purposes.
- A red-flag list — each bullet pinned to a specific data point in the dossier.

The AI is constrained to only use the structured JSON we feed it. It cannot invent organizations, departments, dates, or amounts. When a flagged entity is likely an amalgamation or successor-entity event (regional health authorities, Crown corporations), the prompt instructs the model to say so explicitly rather than imply wrongdoing.

---

## Why it matters

Across three Canadian governments, billions of dollars flow into charities and non-profits every year. The CRA T3010 charity registry, federal grants & contributions, and provincial open data exist — but they live in separate systems with separate identifiers. *The same organization receives money from all three under slightly different names with slightly different business numbers.*

The Agency 2026 hackathon dataset solved that problem: a cross-dataset entity-resolution pipeline producing **851,300 canonical organizations**, each linking back to every source row that contributed to it.

Zombie Tracker rides on top of that infrastructure to ask one question: **when public dollars go to a charity that stops reporting, did the public get what it paid for?**

---

## How it defines a zombie

The definition is intentionally narrow, defensible, and reproducible from open data alone.

An organization is flagged if it received **≥ $100,000 in total public funding** (federal grants + Alberta grants/contracts/sole-source) AND triggers at least one of the following:

1. **Linked Alberta non-profit registration is dissolved/struck/cancelled** — restricted to Alberta-native registration types (Alberta Society, Religious Society, Non-Profit Private/Public Company, Recreation/Agricultural Society). Extra-Provincial Non-Profit Corporation status is *excluded* — those track Alberta registration only, not whether the org has ceased nationally.

2. **Last CRA T3010 filed in 2022 or earlier** — the data range is 2020–2024, so this represents at least two consecutive years of non-filing.

3. **CRA government share of revenue ≥ 70% in last filed year, AND last filed year ≤ 2022** — heavy public dependency combined with a filing gap.

AND the organization is **not currently active** by either of these tests:
- Filed a T3010 for fiscal year 2024.
- Received any federal grant in the last 12 months.

AND the organization is **not a government entity** (filters out names matching "Government of …", "Province of …", municipality, city of …).

The first version of the query produced **$12.2B** in flagged funding. After tightening the definition (proper entity-resolution joins, Alberta-native type restriction, active-org exclusions, government-entity exclusions), the number settled at **$1.5B** across roughly 800 organizations. Smaller number, defensible claims. Every dollar maps to specific T3010, federal-disclosure, or Alberta-open-data rows that a journalist can verify directly.

See [`lib/queries.ts`](lib/queries.ts) for the full SQL.

---

## How the AI works

When a card is tapped, the API:

1. Loads the canonical entity from `general.entity_golden_records`.
2. Pulls top federal grants from `fed.grants_contributions` via `general.entity_source_links`.
3. Pulls top Alberta grants from `ab.ab_grants` via the same link table.
4. Pulls last-filed CRA financials from `cra.govt_funding_by_charity`.
5. Builds a 10-year funding-by-year time series from the union.
6. Hands a single JSON object to `claude-sonnet-4-6` over the streaming API.

The system prompt forbids the model from using any number, name, or date that isn't in the JSON. It also includes two worked examples (one small charity, one likely-amalgamation) so the model knows the difference between "stopped operating" and "merged into a successor entity." The streaming SSE response is rendered live in the dossier sheet — the audience watches the report write itself.

See [`lib/anthropic.ts`](lib/anthropic.ts) for the full system prompt.

---

## Demo path

The live site is fastest from a phone. Three taps cover three different signal types:

| # in feed | Organization | Province | What this card shows |
|:---:|---|:---:|---|
| **1** | St. Stephen's Community House | ON | $115M in public funding — $94M from a single department, IRCC. Last T3010 filed for fiscal 2020. The AI flags a federal grant on April 1, 2022 — two years after the last public filing. |
| **2** | Northwest Inter-Nation Family and Community Services Society | BC | $114M, with $101M in federal grants. **100% public revenue dependency** in its last filed year. Indigenous family services. Stopped filing T3010 in 2021. |
| **4** | Addictions Foundation of Manitoba | MB | $108M total public funding, **94% from government**. Last T3010 filed for fiscal 2022. Manitoba's primary addictions response, gone dark in the open record. |

Each tap streams a complete narrative + red-flag list in roughly 8 seconds.

---

## Data sources

All open data, redistributed under their original publishers' open-government licences:

- **CRA T3010 Charity Filings (2020–2024)** — ~7.3M raw filings + ~1.4M pre-computed analysis rows from ~85,000 registered Canadian charities. [Open Government Licence — Canada](https://open.canada.ca/en/open-government-licence-canada).
- **Federal Grants & Contributions (2006–2025)** — ~1.28M agreements from 51+ federal departments, Government of Canada Open Data portal. [Open Government Licence — Canada](https://open.canada.ca/en/open-government-licence-canada).
- **Alberta Open Data (2014–2026)** — ~1.99M provincial grants, 67K Blue Book contracts, 15K sole-source contracts, 69K non-profit registry records. [Open Government Licence — Alberta](https://open.alberta.ca/licence).
- **Cross-dataset entity resolution** — golden records and source links from the [GovAlta/agency-26-hackathon](https://github.com/GovAlta/agency-26-hackathon) pipeline (deterministic + Splink Fellegi-Sunter + LLM-confirmed matching).

---

## Known limitations

- **Five-year T3010 window.** "Stopped filing" is inferred from the absence of a 2023 or 2024 return; the source dataset only covers 2020–2024. An organization that stopped filing earlier than 2020 won't appear.
- **Amalgamations vs. cessations.** Some flagged entities are not "zombies" but were merged into a successor (Newfoundland Health Services, post-2023 amalgamated regional health authorities, etc.). The prompt is instructed to flag these patterns explicitly rather than imply wrongdoing — but the data alone cannot distinguish a cessation from a name change without the user doing follow-up reporting.
- **Provincial coverage limited to Alberta.** Other provinces publish equivalent open data; expansion to Ontario, BC, and Quebec is the obvious next step.
- **First load is slow.** The complex join across `vw_entity_funding`, `entity_source_links`, and the CRA government-funding rollup takes ~10 seconds on a cold cache. Server-side caching makes subsequent loads instant.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 App Router · Tailwind CSS · Framer Motion · Lucide icons |
| Backend | Next.js API routes (Node runtime) · raw SQL via `pg` |
| AI | Anthropic Claude Sonnet 4.6 · streaming SSE |
| Database | PostgreSQL 14 (read-only, hosted by hackathon organizers on Render) |
| Hosting | Vercel (US East, single region) |

The whole app is one Next.js project. No state manager, no ORM, no map library, no third-party UI kit. Cards in the feed are React Server Components rendering JSON from a single `/api/zombies` endpoint; the dossier sheet is a client component talking to two API routes (one for structured data, one for the streaming AI narrative).

---

## Run it locally

```bash
git clone https://github.com/saidzaripov/zombie-tracker
cd zombie-tracker
cp .env.example .env.local
# fill in DATABASE_URL (read-only credential from the hackathon info pack
# or your own Postgres clone of agency-26-hackathon) and ANTHROPIC_API_KEY
npm install
npm run dev
# open http://localhost:3000
```

The hackathon-distributed read-only Postgres credential lives in the Agency 2026 information pack — request it from the hackathon organizers, or rebuild your own local copy by following [GovAlta/agency-26-hackathon's `.local-db/` instructions](https://github.com/GovAlta/agency-26-hackathon#local-database-recreation-local-db).

---

## Project structure

```
app/
  page.tsx                                  entry
  layout.tsx                                root layout + metadata
  globals.css                               dark-theme styles + utilities
  components/
    HeaderTicker.tsx                        animated $ counter
    FilterChips.tsx                         source × province × min-funding
    ZombieFeed.tsx                          feed orchestration
    ZombieCard.tsx                          single card
    DossierSheet.tsx                        bottom-sheet dossier with streaming AI
    Footer.tsx                              attribution
  lib-client/format.ts                      money/date helpers (client)
  api/
    totals/route.ts                         ticker number
    zombies/route.ts                        ranked feed list (cached)
    zombies/[id]/dossier/route.ts           structured per-entity data
    zombies/[id]/narrative/route.ts         SSE stream from Anthropic
lib/
  db.ts                                     pg pool
  cache.ts                                  in-memory TTL cache
  queries.ts                                zombie SQL + dossier SQL
  anthropic.ts                              SDK wrapper + system prompt
  types.ts                                  shared types
```

---

## Author & licence

Built solo by **Said Zaripov** — [GitHub](https://github.com/saidzaripov).

Source code: **MIT** (see [LICENSE](LICENSE), if present). The MIT licence on this repository covers the source code only and does not relicense the underlying data, which remains under its original open-government licences (see *Data sources* above).

Built using:
- [agency-26-hackathon](https://github.com/GovAlta/agency-26-hackathon) — data pipeline and entity resolution by GovAlta and the Agency 2026 hackathon organizers.
- [Anthropic Claude](https://www.anthropic.com/) for streaming forensic narratives.

If this project gives you ideas for adapting open data for civic transparency, please fork it. PRs welcome — especially for provincial coverage beyond Alberta.
