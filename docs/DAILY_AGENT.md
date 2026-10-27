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
2. **Read today's inbox** (no judgment yet). Your cloud session can't reach news or SEC websites, so a GitHub Action
   collects them at 09:00 UTC and saves every page's text on the `agent-inbox` branch:
   ```bash
   git fetch origin agent-inbox
   npx tsx scripts/inbox.ts
   ```
   It lists today's numbered items (new SEC filings of tracked companies, company newsroom posts, news) with their saved pages.
   If the inbox's date isn't today or yesterday, or no page was saved, stop, commit nothing, and say so in your report.
3. **Sort** — read the headlines. For each, decide: a **new deal** between two tracked companies, a **change** to a deal we already have (revised, expanded, canceled, completed), or **irrelevant** (most are: earnings, products, people, opinion). Tracked companies are the files in `data/companies/`. Skip anything that isn't money moving between two tracked companies.
4. **Extract** — for each remaining item (official sources first):
   - Read its saved pages: `npx tsx scripts/inbox.ts show <n>` (first 60,000 characters) or `npx tsx scripts/inbox.ts grep <n> billion agreement` to find the sentences that matter. For 8-Ks the EX-99.1 press release is saved next to the filing.
   - Use **only** URLs listed in the inbox as sources; you can't verify anything else today.
   - Check `data/deals/` for the same deal (same two companies and type, similar date/amount). If it's already there, skip it, or, if the terms changed, treat it as an update.
   - Write the deal as JSON to `.queue/candidates/<short-name>.json` following `src/lib/schema.ts` and the brief: `from` pays, `to` gets paid; `amount_kind` confirmed / up_to / estimated / undisclosed (never invent a number); `quote` = ONE sentence copied exactly from the saved page; plain-English `explain`. You may leave out `id`, `added`, `last_checked`, `publisher` and source `kind`; the checker fills them.
5. **Check and route** (code, not you): for every candidate run
   ```bash
   AGENT_INBOX_REF=origin/agent-inbox npx tsx scripts/propose-deal.ts .queue/candidates/<file>.json
   AGENT_INBOX_REF=origin/agent-inbox npx tsx scripts/propose-deal.ts .queue/candidates/<file>.json --update-of <existing-deal-id>   # changed deal
   ```
   It checks the quote is really on the saved source page, that it isn't a duplicate, that the amount is sensible, and that check-data passes. Then it prints:
   - `PUBLISH` — official source (SEC filing or the company's own site) and every check passed: written to `data/deals/` with a changelog entry.
   - `REVIEW` — queued in `.queue/queue.json` for a pull request.
   - `DROP` — the quote isn't on the page, it's a duplicate, or it fails the schema. If you think the drop is wrong, fix the candidate (usually: re-copy the exact sentence) and run it again. Never edit the checker, and never touch the `agent-inbox` branch.
6. **Publish the auto-approved deals and today's changes**
   ```bash
   npm run check-data -- --against origin/main
   npm test
   git add data/ && git commit -m "Daily update $(date -u +%F)" && git push origin main
   ```
   (Skip the commit if nothing changed. Never commit `.queue/`.)
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
