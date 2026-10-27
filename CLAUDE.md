# AI Atlas — agent guide

Read `docs/PLAN.md` (the product plan) and `DECISIONS.md` (choices already made — don't re-argue them) first.
Also read `AGENTS.md`: this Next.js version differs from older ones; check `node_modules/next/dist/docs/` before using an API.

## Stack
Next.js 16 (App Router) + TypeScript · Tailwind CSS v4 · Framer Motion (`motion`) · react-force-graph-2d (Money Graph) ·
MapLibre GL + deck.gl (Energy Map) · Recharts · Zod (data schemas) · Vitest (logic tests) · Playwright (screenshots) ·
Vercel hosting · a scheduled Claude Code routine (daily agent, see docs/DAILY_AGENT.md) · GitHub Actions (grid refresh, weekly re-check, CI).

## Folder layout
```
data/
  companies/<id>.json     one Company per file
  deals/<id>.json         one Deal per file (never delete; mark revised/canceled)
  datacenters/<id>.json   one DataCenter per file
  changelog/<date>.json   what changed each day (feeds /changes)
  generated/              script output: powerplants, grid mix, prices, graph layout, source checks
  sample/                 Phase 0 fake data (npm run check-data -- --sample)
  roster.json             canonical company ids per sector
src/lib/                  schema.ts, check.ts, quote.ts, graph logic (loops, totals, exposure), data loaders
src/app/                  routes: / (Money Graph), /energy, /company/[id], /changes, /methodology
src/components/           UI
scripts/                  check-data, verify-quote, verify-sources, importers (sec, eia, epoch), build-graph, daily agent
tests/                    vitest logic tests
docs/                     PLAN.md, RESEARCH_BRIEF.md, ops notes
```

## The three data rules
1. **Lines point the way money moves.** `from` pays, `to` gets paid (investor → company, buyer → chip maker,
   AI lab → cloud, data center owner → power company).
2. **Never delete a deal.** Mark it `revised` (with `superseded_by`) or `canceled`, and link the new version.
3. **Never add "up to" amounts to confirmed ones.** Totals keep confirmed / up to / estimated separate.

Every deal has a source link, a date and an exact one-sentence quote that `scripts/verify-quote.ts` finds on the page.

## Before finishing any change
```bash
npm run check-data
npm test
npm run lint
npm run build
```
For UI changes, also run `npm run screenshots` and look at the PNGs in `screenshots/`.
