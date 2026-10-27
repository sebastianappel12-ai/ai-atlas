# Running AI Atlas

## One-time setup (Sebastian)

These need your accounts, so the coding agent can't do them.

1. **Connect Vercel to GitHub** (needed for automatic deploys and preview links per pull request).
   vercel.com → Account Settings → Authentication → *Connect* GitHub, then allow the Vercel app access to `sebastianappel12-ai/ai-atlas`.
   Then import the repo (or ask the agent to create the project); framework Next.js, no settings to change.
2. **Turn on Vercel Web Analytics** for the project (Project → Analytics → Enable). The code is already in the site.
3. **The daily update agent** is a scheduled Claude Code routine (cloud, runs on your Claude plan; no API key or per-token bill). It follows `docs/DAILY_AGENT.md`. Manage it at https://claude.ai/code/routines (pause, edit, run now, see past runs).
4. **(Optional) EIA API key** — free at https://www.eia.gov/opendata/register.php. Without it the job uses EIA's keyless bulk file (also free, a few hours older).
   ```bash
   gh secret set EIA_API_KEY --repo sebastianappel12-ai/ai-atlas
   ```
5. **(Optional) Custom domain** — see `docs/LAUNCH.md`. Then set `NEXT_PUBLIC_SITE_URL` in Vercel to the domain so share images and the sitemap use it.

## Every day (2–5 minutes)

- The **daily update agent** (Claude routine) runs every morning: it collects new filings and news, reads them, proposes deals, and `scripts/propose-deal.ts` checks each one in code.
- Deals from SEC filings or a company's own press release that pass every check are published automatically.
- Separately, the **Daily grid refresh** GitHub Action updates the Energy Map's grid colors at 10:30 UTC.
- Everything else arrives as a pull request titled **"Deals for review YYYY-MM-DD"**. Open it, read each deal's quote and link, edit the JSON if needed, then **merge to publish** or **close to reject**.
- If a run fails you get an issue labeled `agent-failure`.

## Every week

- The **Weekly re-check** workflow (Mondays) re-verifies deals still marked "announced", refreshes Epoch's data centers, and on the first Monday of the month refreshes EIA power plants, prices and SEC revenue.
- Sources that no longer show their quote become an issue labeled `data-error`.

## Cost

The daily agent runs on your Claude subscription (routine runs count toward its usage), so there is no separate API bill. Hosting, GitHub Actions and the data sources are free.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local site at http://localhost:3000 |
| `npm run check-data` | Validate all data (add `-- --against origin/main` to also block deleted deals) |
| `npm test` | Logic tests, including the plan's measurable criteria on the real data |
| `npm run verify-sources` | Re-fetch every source and confirm each quote is on the page |
| `npx tsx scripts/audit-amounts.ts` | Flag amounts not stated in the quoted sentence |
| `npx tsx scripts/spot-check.ts --n 30` | Draw a random sample for a hand check → `docs/SPOT_CHECK.md` |
| `npm run collect` | See what the daily agent would read today |
| `npx tsx scripts/propose-deal.ts file.json` | Run the code checks on a proposed deal and publish / queue / drop it |
| `npm run screenshots` | Playwright screenshots of every page into `screenshots/` |
