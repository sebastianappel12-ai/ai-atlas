# Seed research brief (Phase 1)

You are filling AI Atlas with **real, sourced** data about money moving through the AI industry.
The site's whole value is trust: **one made-up deal and investors stop trusting all of it.**
When in doubt, leave it out.

Repo root: `/Users/sebastianappel/Desktop/Projects/AI Atlas` (note the space; quote paths).
Today is **2026-10-26**. Use `"added": "2026-10-26"` and `"last_checked": "2026-10-26"` on everything you write.

## What to write

- One JSON file per record, named `<id>.json`, pretty-printed with 2-space indent.
- Companies → `data/companies/<id>.json`. Deals → `data/deals/<id>.json`. Data centers → `data/datacenters/<id>.json`.
- The schema is in `src/lib/schema.ts` (Zod). Read it before writing anything. Unknown fields are rejected.
- Use **only** company ids from `data/roster.json`. You may add new companies **in your own sector only**
  (lowercase-kebab-case id; check it isn't already taken). Never rename or edit another sector's company files.
- Only write the files your assignment says you own. Other researchers are writing other files at the same time.

## The three data rules

1. **Lines point the way money moves.** `from` pays, `to` gets paid.
   Investment: investor → company. Chip order: buyer → chip maker. Cloud contract: AI lab → cloud.
   Power deal: data center owner → power company. Lease: tenant → landlord. Loan: lender → borrower.
   Supply: buyer → supplier. Licensing: licensee → licensor. Acquisition: buyer → company bought.
2. **Never delete a deal.** If a deal changed (e.g. "up to $100B" became $30B), write *both*: the old one with
   `"status": "revised"` and `"superseded_by": "<new id>"`, and the new one with `"supersedes": "<old id>"`.
   Canceled deals stay, with `"status": "canceled"`.
3. **Never mix "up to" with confirmed.** `amount_kind` is one of:
   - `confirmed` — a firm number in a filing or official release ("will invest $2 billion", "a $10 billion contract")
   - `up_to` — a ceiling or headline that hasn't fully happened ("up to $100 billion", "as much as", "potential")
   - `estimated` — a number from reporting/analysts, not the companies ("people familiar said about $10 billion")
   - `undisclosed` — real deal, no number given. Then `amount_usd` must be `null`.
   Amounts are whole US dollars (`2000000000`, not `2`). Convert other currencies at the deal-date rate and say so in `explain`.

## Sources and quotes (the most important part)

Every deal needs `sources` (at least one). Each source:

```json
{
  "url": "https://...",
  "publisher": "NVIDIA Newsroom",
  "date": "2025-09-22",
  "kind": "press_release",
  "quote": "One exact sentence copied from the page that proves the deal."
}
```

- `kind`: `sec_filing` (sec.gov), `press_release` (the company's own newsroom/IR or its official wire release),
  `news`, `dataset`, `other`. Official = `sec_filing` or `press_release`. **Prefer official sources.**
- `quote` must be **one sentence copied exactly** from the page, 20–400 characters. Never stitch, paraphrase or
  "fix" it. Never quote more than one sentence from a news article (copyright).
- **Verify every quote with code before you save it:**

  ```bash
  cd "/Users/sebastianappel/Desktop/Projects/AI Atlas" && npx tsx scripts/verify-quote.ts "<url>" "<quote>"
  ```

  - `FOUND` → good.
  - `NOT_FOUND` → your quote doesn't match the page text. Re-copy it exactly, or pick another sentence.
  - `BLOCKED` / `ERROR` → the site blocks bots. Find another source that works: the SEC 8-K exhibit
    (EX-99.1 press release on sec.gov), the company's investor-relations page, or another outlet.
    Do **not** try to get around a block (no fake browser user agents, no proxies, no caches/archives).
  - Rule of thumb: SEC filings (sec.gov/Archives/...) and many company newsrooms work. openai.com, Reuters,
    Bloomberg and Business Wire usually block.
- **Every deal must have at least one source that verifies `FOUND`.** If after a real effort no source
  verifies, don't write the deal; list it in your report instead.
- To find exact sentences, use WebSearch, then `curl -s -A "AIAtlasBot/0.1 (+https://github.com/sebastianappel12-ai/ai-atlas)" <url>`
  (for sec.gov use `-A "AI Atlas research sebastianappel12@gmail.com"`) and grep the HTML, or WebFetch to locate the passage.
  Always confirm with `verify-quote.ts` — WebFetch summaries are not exact text.
- `confidence`: `high` = official source with a firm number; `medium` = official but vague, or news-only;
  `low` = single news report. Prefer high.

## Deal records

```json
{
  "id": "nvidia-openai-investment-2025",
  "from": "nvidia",
  "to": "openai",
  "type": "investment",
  "title": "Nvidia to invest up to $100B in OpenAI",
  "amount_usd": 100000000000,
  "amount_kind": "up_to",
  "date": "2025-09-22",
  "length_years": 5,
  "status": "announced",
  "sources": [ ... ],
  "confidence": "high",
  "last_checked": "2026-10-26",
  "added": "2026-10-26",
  "explain": "Plain English for non-investors: who pays whom, for what, and why it matters. 1-3 sentences."
}
```

- `id`: `<from>-<to>-<short-what>-<year>`, e.g. `openai-oracle-cloud-2025`. Must be unique; check `data/deals/` first.
- `type`: `investment`, `acquisition`, `chip_order`, `cloud_contract`, `power_deal`, `supply`, `data_center`, `financing`, `licensing`.
  `chip_order` must point at a chip designer/factory; `cloud_contract` at a cloud/neocloud; `power_deal` at a power company.
- `date`: announcement/signing date (YYYY-MM-DD). Range 2019-01-01 to today. Earlier milestone deals (e.g. Microsoft→OpenAI 2019)
  are welcome; the time slider replays 2019 → today.
- `status`: `announced`, `in_progress`, `completed`, `revised`, `canceled`.
- `explain`: plain English, no jargon (or define it), no hype. Written for someone who doesn't invest.
- Multi-tranche deals: one record per distinct announced commitment (e.g. separate funding rounds), not per wire transfer.
- `datacenter_ids` / `plant_ids`: leave out unless told otherwise.

## Company records

```json
{
  "id": "coreweave",
  "name": "CoreWeave",
  "sector": "neocloud",
  "public": true,
  "ticker": "NASDAQ:CRWV",
  "cik": "0001769628",
  "country": "US",
  "hq_state": "NJ",
  "website": "https://www.coreweave.com",
  "aliases": ["CoreWeave Inc"],
  "valuation": { ... optional MoneyFact ... },
  "backlog": { ... optional MoneyFact ... },
  "description": "One line, under 200 characters: what the company does.",
  "explain": "Plain English, 1-3 sentences: why it matters in the AI money web."
}
```

- `ticker`: TradingView format `EXCHANGE:SYMBOL` (`NASDAQ:NVDA`, `NYSE:ORCL`, `TWSE:2330`, `KRX:005930`, `TSE:8035`, `EURONEXT:ASML`). Required if public.
- `cik`: 10-digit SEC CIK for SEC filers (look up at `https://www.sec.gov/cgi-bin/browse-edgar?company=<name>&type=10-K`).
  **US SEC filers: set `cik` and skip `revenue`** — a script fills revenue from SEC XBRL data.
- Everyone else (private, or foreign without US XBRL filings): add `revenue` (latest fiscal year) and, for private companies,
  `valuation` (latest round). MoneyFact shape:

  ```json
  { "amount_usd": 13000000000, "period": "2025", "as_of": "2025-12-31", "estimate": true,
    "low_usd": 12000000000, "high_usd": 13500000000,
    "source": { "url": "...", "publisher": "...", "date": "...", "kind": "news", "quote": "Exact sentence." } }
  ```
  `estimate: true` for anything not from audited financials (all private-company revenue). Give `low_usd`/`high_usd` when sources disagree.
  Verify these quotes too.
- Cloud giants and neoclouds: add `backlog` (remaining performance obligations / contracted backlog) from the latest quarter, with source.
- `newsroom_feed`: an RSS/Atom URL for the company's press releases if one exists (check it returns XML). Optional.
- `country`: ISO 2-letter. `hq_state` required for US companies.

## Before you finish

```bash
cd "/Users/sebastianappel/Desktop/Projects/AI Atlas" && npx tsx scripts/check-data.ts --partial
```

Fix every error in **your** files (ignore errors in other researchers' files). Then reply with a short report:
counts written, deals you skipped and why, any company you think is missing from the roster (id, name, sector, which deals need it),
and any deal where sources disagree.
