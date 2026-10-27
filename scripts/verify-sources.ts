/**
 * Re-check every deal source: does the link work, and does the exact quote appear on the page?
 *   npx tsx scripts/verify-sources.ts                 # all deals
 *   npx tsx scripts/verify-sources.ts --ids a,b,c     # some deals
 *   npx tsx scripts/verify-sources.ts --older-than 7  # only sources not checked in 7 days
 * Writes data/generated/source-checks.json and prints deals with no verified source.
 */
import fs from "node:fs";
import path from "node:path";
import { readJsonDir, ROOT, writeJson } from "../src/lib/data-fs";
import { checkQuote, type QuoteCheckResult } from "../src/lib/quote";
import type { Deal } from "../src/lib/schema";

const OUT = path.join(ROOT, "data/generated/source-checks.json");
const args = process.argv.slice(2);
const idsArg = args.includes("--ids") ? new Set(args[args.indexOf("--ids") + 1].split(",")) : null;
const olderThan = args.includes("--older-than") ? Number(args[args.indexOf("--older-than") + 1]) : null;

type Entry = QuoteCheckResult & { deal: string; url: string; checked: string };
const prev: Record<string, Entry> = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")).checks : {};
const deals = readJsonDir(path.join(ROOT, "data/deals")).map((r) => r.data as Deal);
const key = (d: Deal, i: number) => `${d.id}#${i}`;
const today = new Date().toISOString().slice(0, 10);

const jobs: { k: string; deal: Deal; i: number }[] = [];
for (const d of deals) {
  if (idsArg && !idsArg.has(d.id)) continue;
  d.sources.forEach((_, i) => {
    const k = key(d, i);
    const p = prev[k];
    if (olderThan !== null && p && (Date.parse(today) - Date.parse(p.checked)) / 864e5 < olderThan) return;
    jobs.push({ k, deal: d, i });
  });
}

// Be polite: one request at a time per host, a few hosts in parallel.
const byHost = new Map<string, typeof jobs>();
for (const j of jobs) {
  const h = new URL(j.deal.sources[j.i].url).hostname;
  byHost.set(h, [...(byHost.get(h) ?? []), j]);
}
const results: Record<string, Entry> = { ...prev };
let done = 0;
const queues = [...byHost.values()];
async function worker() {
  for (;;) {
    const q = queues.shift();
    if (!q) return;
    for (const j of q) {
      const s = j.deal.sources[j.i];
      const r = await checkQuote(s.url, s.quote);
      results[j.k] = { ...r, deal: j.deal.id, url: s.url, checked: today };
      if (++done % 25 === 0) console.log(`  ${done}/${jobs.length}`);
      await new Promise((res) => setTimeout(res, new URL(s.url).hostname.endsWith("sec.gov") ? 150 : 400));
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

// Drop entries for deals/sources that no longer exist.
const live = new Set(deals.flatMap((d) => d.sources.map((_, i) => key(d, i))));
for (const k of Object.keys(results)) if (!live.has(k)) delete results[k];

const perDeal = new Map<string, Entry[]>();
for (const e of Object.values(results)) perDeal.set(e.deal, [...(perDeal.get(e.deal) ?? []), e]);
const verified = deals.filter((d) => perDeal.get(d.id)?.some((e) => e.status === "found"));
const unverified = deals.filter((d) => !perDeal.get(d.id)?.some((e) => e.status === "found"));
const counts = Object.values(results).reduce<Record<string, number>>((m, e) => ((m[e.status] = (m[e.status] ?? 0) + 1), m), {});

writeJson(OUT, { checked: today, summary: { deals: deals.length, verified: verified.length, sources: counts }, checks: results });
console.log(`verify-sources: ${verified.length}/${deals.length} deals have a source whose quote was found on the page`, counts);
for (const d of unverified) {
  const es = perDeal.get(d.id) ?? [];
  console.log(`  UNVERIFIED ${d.id}: ${es.map((e) => `${e.status}${e.http ? ` ${e.http}` : ""}`).join(", ") || "not checked"}`);
}
