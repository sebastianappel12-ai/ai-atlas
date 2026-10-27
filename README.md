# AI Atlas

A free public map of how money and power move through the AI industry.

- **Money Graph** — every dot a company, every line a deal, particles flowing the way the money moves. Every deal has a source link, a date and the exact sentence that proves it.
- **Energy Map** — every big US AI data center, the power plants and grid regions that feed it, the power deals behind them, and electricity prices by state.
- **Explain this** — one switch turns every number into plain English.

Updated every morning by an AI agent that only auto-publishes deals it can prove from an official source.

**Not investment advice.** Data: SEC EDGAR, company press releases, [Epoch AI](https://epoch.ai/data/data-centers) (CC-BY), U.S. EIA (public domain), HIFLD.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
npm run check-data   # validate every record
npm test             # logic + plan criteria
```

- Plan: [`docs/PLAN.md`](docs/PLAN.md) · Decisions: [`DECISIONS.md`](DECISIONS.md) · Agent guide: [`CLAUDE.md`](CLAUDE.md)
- Operations (keys, daily review, costs): [`docs/OPS.md`](docs/OPS.md)
- Criteria status: [`docs/CRITERIA.md`](docs/CRITERIA.md) · Launch kit: [`docs/LAUNCH.md`](docs/LAUNCH.md)

Found a wrong number? [Report an error](https://github.com/sebastianappel12-ai/ai-atlas/issues/new?template=report-error.yml).
