/**
 * How much the daily agent has spent on the Claude API, by month. The budget is $20/month.
 *   npx tsx scripts/cost-report.ts
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../src/lib/data-fs";

const file = path.join(ROOT, "data/generated/agent-costs.json");
const runs: { date: string; usd: number; items: number; published: number; queued: number }[] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).runs : [];
const months = new Map<string, { usd: number; runs: number; published: number; queued: number }>();
for (const r of runs) {
  const m = months.get(r.date.slice(0, 7)) ?? { usd: 0, runs: 0, published: 0, queued: 0 };
  m.usd += r.usd;
  m.runs++;
  m.published += r.published;
  m.queued += r.queued;
  months.set(r.date.slice(0, 7), m);
}
if (!months.size) console.log("No agent runs logged yet.");
for (const [m, v] of [...months].sort()) {
  console.log(`${m}  $${v.usd.toFixed(2)}  (${v.runs} runs, ${v.published} auto-published, ${v.queued} sent to review)  ${v.usd < 20 ? "under budget" : "OVER the $20 budget"}`);
}
