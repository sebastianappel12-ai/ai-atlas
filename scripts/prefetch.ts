/**
 * Daily agent inbox (runs in GitHub Actions, which can reach every source): save the text of
 * every collected page so the cloud Claude agent, whose network is restricted, can read them.
 *   npx tsx scripts/prefetch.ts --out /tmp/inbox
 * Reads .queue/items.json (from collect.ts). Writes <out>/items.json and <out>/pages/<key>.txt,
 * where key = pageKey(url). Quote checks later read these exact files back from git.
 */
import fs from "node:fs";
import path from "node:path";
import { pageKey } from "../src/lib/inbox";
import { ROOT, writeJson } from "../src/lib/data-fs";
import { fetchPageText } from "../src/lib/quote";
import type { Item } from "../src/lib/agent/collect";

const args = process.argv.slice(2);
const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : path.join(ROOT, ".queue/inbox");
const MAX_CHARS = 3_000_000; // keeps huge S-1s manageable

const { date, items } = JSON.parse(fs.readFileSync(path.join(ROOT, ".queue/items.json"), "utf8")) as { date: string; items: Item[] };
fs.mkdirSync(path.join(out, "pages"), { recursive: true });

const pages: Record<string, { key: string; http: number | null; chars: number; error?: string }> = {};
for (const it of items) {
  for (const url of [it.url, ...(it.extraUrls ?? [])]) {
    if (pages[url]) continue;
    const key = pageKey(url);
    try {
      const r = await fetchPageText(url, 30000);
      const text = r.text.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
      if (r.http < 400) fs.writeFileSync(path.join(out, "pages", `${key}.txt`), text);
      pages[url] = { key, http: r.http, chars: r.http < 400 ? text.length : 0 };
    } catch (e) {
      pages[url] = { key, http: null, chars: 0, error: e instanceof Error ? e.message : String(e) };
    }
    await new Promise((res) => setTimeout(res, new URL(url).hostname.endsWith("sec.gov") ? 150 : 400));
  }
}

writeJson(path.join(out, "items.json"), { date, fetched: new Date().toISOString(), items, pages });
const saved = Object.values(pages).filter((p) => p.chars > 0).length;
console.log(`prefetch: saved ${saved} of ${Object.keys(pages).length} pages for ${items.length} items into ${out}`);
