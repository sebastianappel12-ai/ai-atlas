/**
 * Pick N random deals for a human spot-check (Phase 1: "at least 29 of 30 randomly picked
 * deals are correct when you check them by hand"; the plan asks for 1 in every 10).
 *   npx tsx scripts/spot-check.ts [--n 30] [--seed 2026-10-26]
 * Writes docs/SPOT_CHECK.md: a checklist with each deal's claim, quote and link.
 */
import fs from "node:fs";
import path from "node:path";
import { readJsonDir, ROOT } from "../src/lib/data-fs";
import { fmtDealAmount } from "../src/lib/format";
import type { Company, Deal } from "../src/lib/schema";

const args = process.argv.slice(2);
const n = Number(args.includes("--n") ? args[args.indexOf("--n") + 1] : 30);
const seed = args.includes("--seed") ? args[args.indexOf("--seed") + 1] : new Date().toISOString().slice(0, 10);

// Small seeded PRNG so a sample can be regenerated exactly.
let h = [...seed].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 2654435761) >>> 0, 1779033703);
const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0), (h ^= h >>> 13), (h >>> 0) / 4294967296);

const deals = readJsonDir(path.join(ROOT, "data/deals")).map((r) => r.data as Deal).sort((a, b) => a.id.localeCompare(b.id));
const names = new Map(readJsonDir(path.join(ROOT, "data/companies")).map((r) => [(r.data as Company).id, (r.data as Company).name]));
const pool = [...deals];
const pick: Deal[] = [];
while (pick.length < Math.min(n, pool.length)) pick.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);

const md = [
  `# Spot check: ${pick.length} random deals (seed \`${seed}\`)`,
  "",
  "For each deal, open the source and tick the box only if **all** of these are right:",
  "**who pays → who gets paid** (direction), **amount and its kind** (confirmed / up to / estimated / undisclosed), **date**, **status**, and the quote supports the claim.",
  "",
  `Target: at least ${Math.ceil(pick.length * 29 / 30)} of ${pick.length} correct. Note anything wrong in the line under the deal, then fix it with a "revised" version (never delete).`,
  "",
  `Regenerate this exact sample with \`npx tsx scripts/spot-check.ts --n ${n} --seed ${seed}\`.`,
  "",
  ...pick.map((d, i) =>
    [
      `### ${i + 1}. ${d.title}`,
      `- [ ] Correct`,
      `- **${names.get(d.from) ?? d.from} → ${names.get(d.to) ?? d.to}** · ${d.type.replace("_", " ")} · ${fmtDealAmount(d.amount_usd, d.amount_kind)} · ${d.date} · ${d.status} · \`${d.id}\``,
      `- Quote: "${d.sources[0].quote}"`,
      `- Source: ${d.sources[0].url}`,
      `- Notes: `,
      "",
    ].join("\n"),
  ),
  `**Result: __ / ${pick.length} correct.**`,
  "",
].join("\n");
fs.writeFileSync(path.join(ROOT, "docs/SPOT_CHECK.md"), md);
console.log(`wrote docs/SPOT_CHECK.md with ${pick.length} deals`);
