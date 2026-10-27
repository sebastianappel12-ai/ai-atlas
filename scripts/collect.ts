/**
 * Daily agent step 1 (no AI): collect new items from SEC filings, company newsroom feeds
 * and news search, skipping anything seen on earlier days.
 *   npx tsx scripts/collect.ts [--since 2026-10-25]
 * Writes .queue/items.json and prints a numbered list of headlines for the agent to sort.
 */
import fs from "node:fs";
import path from "node:path";
import { collectNews, collectNewsrooms, collectSec, dedupeItems, fetchStats } from "../src/lib/agent/collect";
import { readJsonDir, ROOT, writeJson } from "../src/lib/data-fs";
import type { Company } from "../src/lib/schema";

const args = process.argv.slice(2);
const today = new Date().toISOString().slice(0, 10);
const since = args.includes("--since") ? args[args.indexOf("--since") + 1] : new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
const SEEN = path.join(ROOT, "data/generated/agent-seen.json");

const companies = readJsonDir(path.join(ROOT, "data/companies")).map((r) => r.data as Company);
const seen = new Set<string>(fs.existsSync(SEEN) ? JSON.parse(fs.readFileSync(SEEN, "utf8")).ids : []);
const items = dedupeItems(
  [...(await collectSec(companies, since)), ...(await collectNewsrooms(companies, since)), ...(await collectNews(since < today ? "2d" : "1d"))],
  seen,
);

writeJson(path.join(ROOT, ".queue/items.json"), { date: today, since, items });
for (const it of items) seen.add(it.id);
writeJson(SEEN, { ids: [...seen].slice(-20000) });

const failing = [...fetchStats].filter(([, v]) => v.failed > 0 && v.ok === 0);
console.log(`sources: ${[...fetchStats].map(([h, v]) => `${h} ${v.ok} ok/${v.failed} failed`).join(", ") || "none contacted"}`);
if (failing.length) {
  console.log(`WARNING: these sources could not be reached at all (network blocked?): ${failing.map(([h, v]) => `${h} (${v.lastError})`).join("; ")}`);
}
console.log(`collect: ${items.length} new items since ${since} (saved to .queue/items.json)`);
items.forEach((it, i) => {
  console.log(`${i}. [${it.origin}] ${it.date} ${it.title}`);
  console.log(`   ${it.url}${it.extraUrls?.length ? `  (+ ${it.extraUrls.join(" , ")})` : ""}`);
});
