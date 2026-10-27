# Launch kit (Phase 6)

Posting is yours to do: these are drafts. Post from your own accounts, one place at a time, and stay in the comments for the first hour.

## Before launch

- [ ] Vercel connected and the site live (see `docs/OPS.md`)
- [ ] Spot check passed: 29+ of 30 (`docs/SPOT_CHECK.md`)
- [ ] Three investors answered "who pays Nvidia the most?" in under 30 seconds
- [ ] A non-investor friend explained the graph back after using Explain mode
- [ ] Daily agent ran 14 mornings in a row without breaking
- [ ] Domain bought and connected (optional)

## Domain

Checked 2026-10-26 via Vercel: `aiatlas.com`, `.org`, `.io`, `.app`, `.dev`, `.xyz`, `.info`, `theaiatlas.com` and `getaiatlas.com` are **taken**.
Available: **aimoneyatlas.com** ($11.25/yr, same renewal) and **aiatlas.money** ($19.99 first year, $34.51/yr renewal).
`aimoneyatlas.com` fits the plan's ~$1/month line and keeps the name.

## Hacker News (Show HN)

**Title:** Show HN: AI Atlas – a map of the money moving through the AI industry, every deal sourced

> I built a free map of who pays whom in AI: ~190 companies and ~370 deals (chip orders, cloud contracts, investments, power deals), each with a link to the filing or press release and the exact sentence that proves it. A script fetches every source and checks the quote is really on the page, so nothing is made up.
>
> Things I found interesting building it: the circular deals (Nvidia invests in CoreWeave, CoreWeave buys Nvidia GPUs; the loop finder shows 27 of these), how much of Oracle's backlog is one customer, and how "up to $100B" headlines shrink (the time slider shows Nvidia → OpenAI going from "up to $100B" to $30B).
>
> There's also an Energy Map of every big US AI data center, the power plants around it and today's grid fuel mix from EIA data.
>
> A daily agent reads SEC filings and newsrooms and only auto-publishes what it can prove from an official source; the rest waits for my approval. Data and code are open on GitHub. Not investment advice. Feedback on mistakes is very welcome — every deal has a "Report an error" link.

## r/dataisbeautiful

**Title:** [OC] Every big money flow in the AI industry, mapped — 370 deals between 190 companies, each linked to its source

> Tools: Next.js, react-force-graph, deck.gl/MapLibre. Data: SEC filings, company press releases, Epoch AI (data centers, CC-BY), EIA (power plants, grid mix). Dot size = revenue, line thickness = deal size on a log scale, dashed = announced/"up to" money that hasn't happened yet. Interactive version: https://ai-atlas-pearl.vercel.app

(r/dataisbeautiful requires `[OC]` and a source/tools comment; post a static screenshot of the graph as the image.)

## r/stocks

**Title:** I mapped who pays whom in AI (chips, cloud, power) with a source for every deal — free tool

> Click any company to see who pays it the most, every deal with a link, and an exposure score (how much of a company's backlog comes from one customer). Confirmed money and "up to" money are kept separate so the totals aren't inflated. Not investment advice; it's a reference tool. https://ai-atlas-pearl.vercel.app

(Check r/stocks self-promotion rules first; post in the daily thread if required.)

## X / Twitter (thread)

1. I mapped the money moving through the AI industry. 370 deals, 190 companies, and every single deal links to the filing or press release that proves it. 🧵 https://ai-atlas-pearl.vercel.app
2. Dots are companies, lines are deals, and the particles flow the way the money moves. Solid = confirmed. Dashed = "up to" money that hasn't happened yet (never added to the totals). [screenshot]
3. The loop finder highlights circular deals: Nvidia invests in CoreWeave → CoreWeave buys Nvidia GPUs. It finds 27 loops like this. [screenshot]
4. The Energy Map shows every big US AI data center, the power plants near it, the nuclear deals tech companies signed, and today's grid mix. [screenshot]
5. Flip "Explain this" and every number gets a plain-English explanation. Updated every morning by an agent that only auto-publishes what it can prove. Not investment advice. https://ai-atlas-pearl.vercel.app
