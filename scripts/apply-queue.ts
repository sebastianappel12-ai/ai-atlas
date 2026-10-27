/**
 * Move deals the daily agent queued for review (.queue/queue.json) into data/ on a review branch.
 * Updates mark the old deal "revised" and link it to the new one (never delete).
 *   npx tsx scripts/apply-queue.ts
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, writeJson } from "../src/lib/data-fs";
import { ChangelogSchema, type Changelog, type Deal } from "../src/lib/schema";

const q = JSON.parse(fs.readFileSync(path.join(ROOT, ".queue/queue.json"), "utf8")) as { date: string; items: { deal: Deal; updateOf: string | null }[] };
const file = path.join(ROOT, "data/changelog", `${q.date}.json`);
const log: Changelog = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { date: q.date, entries: [] };

for (const { deal, updateOf } of q.items) {
  writeJson(path.join(ROOT, "data/deals", `${deal.id}.json`), deal);
  if (updateOf) {
    const oldFile = path.join(ROOT, "data/deals", `${updateOf}.json`);
    const old = JSON.parse(fs.readFileSync(oldFile, "utf8")) as Deal;
    writeJson(oldFile, { ...old, status: "revised", superseded_by: deal.id, last_checked: q.date });
    log.entries.push({ kind: "revised", record: "deal", id: updateOf, summary: `${old.title} — replaced by a newer version`, via: "review" });
  }
  log.entries.push({ kind: updateOf ? "updated" : "added", record: "deal", id: deal.id, summary: deal.title, via: "review" });
}
writeJson(file, ChangelogSchema.parse(log));
console.log(`applied ${q.items.length} queued deal(s)`);
