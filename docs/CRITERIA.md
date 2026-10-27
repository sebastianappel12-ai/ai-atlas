# "Done when" criteria — status

Status as of 2026-10-26. ✅ = met and verified · 🔧 = built, needs your one-time setup · 👤 = needs a human check · ⏳ = needs time to pass.
Measurable criteria are also enforced by `tests/real-data.test.ts`, so they stay true as data grows.

## Phase 0: Foundations
| Criterion | Status | Evidence |
| --- | --- | --- |
| The site is live at a Vercel link | 🔧 | Builds clean on GitHub CI. Waiting on the Vercel ↔ GitHub connection (docs/OPS.md step 1); then it deploys on every push. |
| check-data rejects a deal that has no source | ✅ | `tests/check.test.ts` "rejects a deal that has no source" |
| A sample page uses the sector colors and fonts | ✅ | Inter + JetBrains Mono, 10 sector colors in `src/lib/sectors.ts`; sample data in `data/sample/` |

## Phase 1: Seed the real data
| Criterion | Status | Evidence |
| --- | --- | --- |
| 150+ companies across all 10 sectors | ✅ | 193 companies, all 10 sectors (`npm run check-data`) |
| 300+ deals, each with a working source link | ✅ | 366 deals; `npm run verify-sources`: every deal has a source whose exact quote was found on the live page |
| At least 29 of 30 random deals correct by hand | 👤 | Sample ready in `docs/SPOT_CHECK.md`. Pre-checks done: every quote verified by code; `scripts/audit-amounts.ts` cross-checked amounts against quotes (5 remaining flags are explained sums/splits). |
| Data centers and power plants imported, check-data passes | ✅ | 76 US data centers (Epoch AI), 4,016 EIA plants ≥ 50 MW; 0 errors |

## Phase 2: Money Graph
| Criterion | Status | Evidence |
| --- | --- | --- |
| Graph loads in under 2 s on a laptop and moves smoothly | ✅ | Production build: graph ready in ~0.85 s (1440×900, `npm run screenshots`); layout precomputed at build, positions fixed, canvas rendering |
| Clicking any company shows all its deals with sources | ✅ | Side panel "Money in / Money out" lists every deal with quote + link; also `/company/[id]` pages |
| Three investors answer "who pays Nvidia the most?" in < 30 s | 👤 | The Nvidia panel opens with a ranked "Who pays Nvidia the most" list (search `/` → Nvidia). Needs three people. |

## Phase 3: Daily update agent
| Criterion | Status | Evidence |
| --- | --- | --- |
| Runs every morning for 2 weeks without breaking | 🔧⏳ | `.github/workflows/daily.yml` (10:30 UTC). Needs `ANTHROPIC_API_KEY` secret, then 14 days. Failures open an `agent-failure` issue. |
| Catches 8 of 10 big deals vs. a hand list for a week | 👤⏳ | Keep a list for one week, compare with `/changes` and the review PRs. |
| Zero made-up deals get published | ✅ (by design) ⏳ | Code-level quote check is mandatory; auto-publish only from SEC filings / the companies' own sites; everything else is a PR you approve. Tested in `tests/agent-checks.test.ts`. |
| Monthly API bill stays under $20 | ✅ (by design) ⏳ | Hard stop at $18/month in the agent; `npm run cost-report`. Estimated $5–12/month at list prices. |

## Phase 4: Graph tools and Explain mode
| Criterion | Status | Evidence |
| --- | --- | --- |
| The time slider replays 2019 to today | ✅ | Play button + slider; test "the time slider replays 2019 to today"; Nvidia→OpenAI shows "up to $100B" then $30B |
| The loop finder catches known loops, like Nvidia and CoreWeave | ✅ | 27 loops incl. CoreWeave ⇄ Nvidia (test on real data) |
| A non-investor friend can explain the graph back after Explain mode | 👤 | Explain switch, hover definitions for jargon, plain-English box on every company/deal, 60-second guided tour |

## Phase 5: Energy Map
| Criterion | Status | Evidence |
| --- | --- | --- |
| Every data center from Phase 1 is on the map, with power and status | ✅ | All 76; circles sized by MW, colored by status; card shows MW now/planned |
| Power plants filter by fuel | ✅ | 10 fuel chips in the Layers panel |
| Grid colors update at least once a day | 🔧 | `import-eia-grid.ts` runs in the daily workflow (keyless EIA-930 bulk file, refreshed daily by EIA); needs the workflow to be running (it is scheduled; deploy needs Vercel) |
| Clicking a data center's owner opens it in the Money Graph | ✅ | Owner/tenant links → `/?c=<id>`; Money Graph → "Data centers on the Energy Map" → `/energy?owner=<id>` |

## Phase 6: Polish and launch
| Criterion | Status | Evidence |
| --- | --- | --- |
| Pages load in under 2 s on a phone | ✅ (local) | `scripts/perf.ts` (4× CPU slowdown, fast 4G): Money Graph 0.19 s, Nvidia panel 0.93 s, Energy Map 1.6 s, company page 0.16 s. Re-run against the live URL after deploy. |
| Methodology page and error button are live | ✅ (in build) 🔧 | `/methodology`, "Report an error" on every deal → GitHub issue form. Live once deployed. |
| Launched in at least 3 places | 👤 | Drafts for Show HN, r/dataisbeautiful, r/stocks, X in `docs/LAUNCH.md` |
| Custom domain | 👤 | Deferred by Sebastian on 2026-10-26 (available: aimoneyatlas.com $11.25/yr, aiatlas.money). Site uses the free vercel.app address. |
