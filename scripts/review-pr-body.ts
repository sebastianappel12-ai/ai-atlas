/**
 * Write the pull-request description for deals queued for review (.queue/queue.json -> .queue/PR_BODY.md).
 *   npx tsx scripts/review-pr-body.ts
 */
import fs from "node:fs";
import path from "node:path";
import { readJsonDir, ROOT } from "../src/lib/data-fs";
import type { Company, Deal } from "../src/lib/schema";

const q = JSON.parse(fs.readFileSync(path.join(ROOT, ".queue/queue.json"), "utf8")) as { date: string; items: { deal: Deal; reasons: string[]; updateOf: string | null }[] };
const names = new Map(readJsonDir(path.join(ROOT, "data/companies")).map((r) => [(r.data as Company).id, (r.data as Company).name]));
const md = [
  `## Daily agent: ${q.items.length} deal(s) waiting for your approval (${q.date})`,
  "",
  "Merge to publish; close to reject. Edit the JSON files first to fix anything. Every quote below was verified on its source page by code.",
  "",
  ...q.items.map(({ deal: d, reasons, updateOf }) =>
    [
      `### ${d.title}`,
      `- **${names.get(d.from)} → ${names.get(d.to)}** · ${d.type} · ${d.amount_kind} ${d.amount_usd ?? "undisclosed"} · ${d.date} · ${d.status}`,
      `- Why it needs review: ${reasons.join("; ")}`,
      updateOf ? `- Replaces \`${updateOf}\` (it will be marked revised, never deleted)` : "",
      `- Source: ${d.sources[0].url}`,
      `- Quote: "${d.sources[0].quote}"`,
      "",
    ].filter(Boolean).join("\n"),
  ),
].join("\n");
fs.writeFileSync(path.join(ROOT, ".queue/PR_BODY.md"), md);
console.log(`wrote .queue/PR_BODY.md for ${q.items.length} deal(s)`);
