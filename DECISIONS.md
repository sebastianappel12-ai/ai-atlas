# Decisions log

New agent sessions: read this instead of re-arguing old choices. Newest at the bottom.

- **2026-10-26 — Repo & hosting.** Public GitHub repo `sebastianappel12-ai/ai-atlas`, Vercel Hobby project `ai-atlas`. (Sebastian)
- **2026-10-26 — One file per record.** `data/{companies,deals,datacenters}/<id>.json`, so agents edit one record at a time and git history is per deal.
- **2026-10-26 — Amount kinds.** `confirmed`, `up_to`, `estimated`, `undisclosed` (amount null). Solid line = confirmed; dashed = everything else. Totals show the buckets separately (rule 3).
- **2026-10-26 — Deal types.** investment, acquisition, chip_order, cloud_contract, power_deal, supply, data_center (lease/build), financing, licensing. check-data enforces payee sector for chip_order / cloud_contract / power_deal (rule 1).
- **2026-10-26 — Honest bots only.** Quote checks fetch with an identifying user agent (`AIAtlasBot/0.1`; sec.gov gets `AI Atlas research <contact>`). Sites that block bots are marked "blocked", never bypassed. Every deal needs ≥1 source the checker finds.
- **2026-10-26 — SEC contact.** sebastianappel12@gmail.com, sent only to sec.gov (env `SEC_CONTACT` overrides). (Sebastian)
- **2026-10-26 — Seed research.** One research subagent per sector; a deal belongs to the payee's sector, except deals paid by investor-sector firms, which the investors researcher owns. (Sebastian approved subagents)
- **2026-10-26 — Sector edge cases.** Meta, Tesla and Apple sit in "AI labs"; Intel and chip-equipment makers sit in "Chip factories & packaging"; Samsung is a chip factory (its memory deals still go there); servers (Dell, Supermicro, HPE, Foxconn) sit in "Networking & equipment"; bitcoin miners hosting AI sit in "Data center builders" (IREN, which sells GPU cloud, is a neocloud); the U.S. Government is an "investor".
- **2026-10-26 — Map tiles.** CARTO Dark Matter vector style (free, no key) instead of Protomaps/MapTiler, so there's no key to manage. Revisit if traffic exceeds CARTO's free-use terms.
- **2026-10-26 — Exposure score uses reported backlog only.** Without a backlog there's no honest denominator, so the score is hidden rather than computed against tracked contracts.
- **2026-10-26 — Investors are sized by money put into tracked deals**, not assets under management (AUM made BlackRock the biggest dot on the map).
- **2026-10-26 — View state lives in the URL** via `history.replaceState` (synced into `useSearchParams` by Next.js), so share links work and dragging the slider never hits the server.
- **2026-10-26 — Grid regions** are HIFLD Control Areas mapped to EIA-930 codes; colored by the dominant fuel in the last 24 h of EIA-930 data. Data center grid region = balancing authority of the nearest EIA plant (approximate, labeled as such).
- **2026-10-26 — Daily agent news source** is the free GDELT DOC API; Google/Bing news feeds don't serve bots. SEC filings and company newsroom feeds are the primary (and only auto-publishable) sources.
- **2026-10-26 — Agent output** uses structured outputs (`messages.parse` + Zod), because forced tool choice isn't supported on Sonnet 5.5. Models: `claude-haiku-5-5` (sort), `claude-sonnet-5-5` (extract). Monthly hard cap $18.
- **2026-10-26 — CoreWeave → Nvidia** is recorded as an undisclosed-amount chip order: CoreWeave's filings say all its GPUs are Nvidia's but never give a dollar total.
