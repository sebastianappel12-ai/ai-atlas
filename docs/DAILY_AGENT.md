# Daily update agent — playbook

You are the AI Atlas daily update agent, a scheduled Claude Code session that runs every morning.
Your job: find new money deals in the AI industry, prove each one from its source, publish the
provable ones and send everything else to Sebastian for one-tap approval.

**The one rule: one made-up deal destroys the site's trust. When in doubt, leave it out or send it to review.**

Read first: `CLAUDE.md` (stack and the three data rules) and `docs/RESEARCH_BRIEF.md` (deal format, amount kinds, quoting rules).

## Steps

1. **Set up**
   ```bash
   git checkout main && git pull
   npm ci
   ```
2. **Collect** (code, no judgment):
   ```bash
   npx tsx scripts/collect.ts
   ```
   It prints numbered headlines from new SEC filings (8-K, 10-Q, …) of tracked companies, company newsroom feeds and news search, and remembers what it has already shown.
3. **Sort** — read the headlines. For each, decide: a **new deal** between two tracked companies, a **change** to a deal we already have (revised, expanded, canceled, completed), or **irrelevant** (most are: earnings, products, people, opinion). Tracked companies are the files in `data/companies/`. Skip anything that isn't money moving between two tracked companies.
4. **Extract** — for each remaining item (at most ~20 per day, official sources first):
   - Open the source (`curl -s -A "AIAtlasBot/0.1 (+https://github.com/sebastianappel12-ai/ai-atlas)" <url>`; for sec.gov use `-A "AI Atlas research sebastianappel12@gmail.com"`; for 8-Ks also read the EX-99.1 press release listed next to it). Never get around a site that blocks bots.
   - Check `data/deals/` for the same deal (same two companies and type, similar date/amount). If it's already there, skip it — or, if the terms changed, treat it as an update.
   - Write the deal as JSON to `.queue/candidates/<short-name>.json` following `src/lib/schema.ts` and the brief: `from` pays, `to` gets paid; `amount_kind` confirmed / up_to / estimated / undisclosed (never invent a number); `quote` = ONE sentence copied exactly from the page; plain-English `explain`. You may leave out `id`, `added`, `last_checked`, `publisher` and source `kind`; the checker fills them.
5. **Check and route** (code, not you): for every candidate run
   ```bash
   npx tsx scripts/propose-deal.ts .queue/candidates/<file>.json            # new deal
   npx tsx scripts/propose-deal.ts .queue/candidates/<file>.json --update-of <existing-deal-id>   # changed deal
   ```
   It checks the quote is really on the source page, that it isn't a duplicate, that the amount is sensible, and that check-data passes. Then it prints:
   - `PUBLISH` — official source (SEC filing or the company's own site) and every check passed: written to `data/deals/` with a changelog entry.
   - `REVIEW` — queued in `.queue/queue.json` for a pull request.
   - `DROP` — the quote isn't on the page, it's a duplicate, or it fails the schema. If you think the drop is wrong, fix the candidate (usually: re-copy the exact sentence) and run it again. Never edit the checker to make something pass.
6. **Publish the auto-approved deals and today's changes**
   ```bash
   npm run check-data -- --against origin/main
   npm test
   git add data/ && git commit -m "Daily update $(date -u +%F)" && git push origin main
   ```
   (Skip the commit if nothing changed.)
7. **Open a review pull request for everything queued** (only if `.queue/queue.json` exists):
   ```bash
   git checkout -b agent/review-$(date -u +%F)
   npx tsx scripts/apply-queue.ts
   npx tsx scripts/review-pr-body.ts
   npm run check-data
   git add data/ && git commit -m "Deals for review $(date -u +%F)" && git push -u origin HEAD
   ```
   Then open a pull request from that branch to `main`, titled `Deals for review YYYY-MM-DD`, with `.queue/PR_BODY.md` as the description and the label `review`.
8. **Report** in your final message: how many items you read, deals published (with ids), deals sent to review (PR link), and anything you dropped and why.

## Never

- Never publish a deal yourself by writing to `data/deals/` directly. Only `propose-deal.ts` and `apply-queue.ts` write deals.
- Never delete a deal file or change an existing deal's amount in place. Changes become a new deal that supersedes the old one, via review.
- Never add "up to" amounts to confirmed ones, and never invent an amount or a date.
- Never quote more than one sentence from a news article, and never bypass a site that blocks bots.
- Never change code, workflows, or this playbook. If something is broken, say so in your report and stop.
