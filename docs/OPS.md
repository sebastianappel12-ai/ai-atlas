# Running AI Atlas

## One-time setup (Sebastian)

These need your accounts, so the coding agent can't do them.

1. **Connect Vercel to GitHub** (needed for automatic deploys and preview links per pull request).
   vercel.com → Account Settings → Authentication → *Connect* GitHub, then allow the Vercel app access to `sebastianappel12-ai/ai-atlas`.
   Then import the repo (or ask the agent to create the project); framework Next.js, no settings to change.
2. **Turn on Vercel Web Analytics** for the project (Project → Analytics → Enable). The code is already in the site.
3. **Anthropic API key for the daily agent.** Create a key at console.anthropic.com (set a monthly spend limit of $20 there too), then:
   ```bash
   gh secret set ANTHROPIC_API_KEY --repo sebastianappel12-ai/ai-atlas
   ```
   Until this exists, the daily job still refreshes grid colors but skips finding deals.
4. **(Optional) EIA API key** — free at https://www.eia.gov/opendata/register.php. Without it the job uses EIA's keyless bulk file (also free, a few hours older).
   ```bash
   gh secret set EIA_API_KEY --repo sebastianappel12-ai/ai-atlas
   ```
5. **(Optional) Custom domain** — see `docs/LAUNCH.md`. Then set `NEXT_PUBLIC_SITE_URL` in Vercel to the domain so share images and the sitemap use it.

## Every day (2–5 minutes)

- The **Daily update agent** workflow runs at 10:30 UTC (6:30 a.m. Eastern in summer, 5:30 in winter).
- Deals from SEC filings or a company's own press release that pass every check are published automatically.
- Everything else arrives as a pull request titled **"Deals for review YYYY-MM-DD"**. Open it, read each deal's quote and link, edit the JSON if needed, then **merge to publish** or **close to reject**.
- If a run fails you get an issue labeled `agent-failure`.

## Every week

- The **Weekly re-check** workflow (Mondays) re-verifies deals still marked "announced", refreshes Epoch's data centers, and on the first Monday of the month refreshes EIA power plants, prices and SEC revenue.
- Sources that no longer show their quote become an issue labeled `data-error`.

## Checking cost

```bash
npm run cost-report
```

The agent stops calling the expensive model once the month reaches $18 (`AGENT_MONTHLY_CAP_USD`), so the bill stays under $20 even on a heavy news month.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local site at http://localhost:3000 |
| `npm run check-data` | Validate all data (add `-- --against origin/main` to also block deleted deals) |
| `npm test` | Logic tests, including the plan's measurable criteria on the real data |
| `npm run verify-sources` | Re-fetch every source and confirm each quote is on the page |
| `npx tsx scripts/audit-amounts.ts` | Flag amounts not stated in the quoted sentence |
| `npx tsx scripts/spot-check.ts --n 30` | Draw a random sample for a hand check → `docs/SPOT_CHECK.md` |
| `npm run agent -- --collect-only` | See what the daily agent would read today, without calling Claude |
| `npm run screenshots` | Playwright screenshots of every page into `screenshots/` |
