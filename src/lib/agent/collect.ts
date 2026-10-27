/**
 * Step 1 of the daily agent: collect candidate items (headlines + links) from
 * SEC filings, company newsroom feeds and news searches. No AI here.
 */
import { decodeEntities, userAgentFor } from "../quote";
import type { Company } from "../schema";
import { enableEnvProxy } from "../net";

export interface Item {
  id: string; // stable key (url)
  title: string;
  url: string;
  date: string; // YYYY-MM-DD
  origin: "sec" | "newsroom" | "news";
  company?: string; // tracked company it came from
  /** For SEC filings: extra documents worth reading (e.g. the EX-99.1 press release). */
  extraUrls?: string[];
}

/** Fetch outcomes per host, so a blocked network shows up instead of looking like a quiet news day. */
export const fetchStats = new Map<string, { ok: number; failed: number; lastError?: string }>();

let lastSec = 0;
async function get(url: string): Promise<Response> {
  const host = new URL(url).hostname;
  const st = fetchStats.get(host) ?? { ok: 0, failed: 0 };
  fetchStats.set(host, st);
  try {
    const res = await rawGet(url);
    if (res.ok) st.ok++;
    else (st.failed++, (st.lastError = `HTTP ${res.status}`));
    return res;
  } catch (e) {
    st.failed++;
    st.lastError = e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e);
    throw e;
  }
}

async function rawGet(url: string): Promise<Response> {
  enableEnvProxy();
  if (new URL(url).hostname.endsWith("sec.gov")) {
    const wait = 120 - (Date.now() - lastSec); // SEC: max 10 requests/second
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastSec = Date.now();
  }
  return fetch(url, { headers: { "User-Agent": userAgentFor(url) }, signal: AbortSignal.timeout(20000) });
}

const ISO = (d: Date) => d.toISOString().slice(0, 10);

/** 8-K items that usually mean money moved: agreements, acquisitions, equity sales, press releases. */
const DEAL_ITEMS = /\b(1\.01|2\.01|2\.03|3\.02|7\.01|8\.01)\b/;
const FORMS = new Set(["8-K", "6-K", "10-Q", "10-K", "20-F", "S-1", "424B4"]);

export async function collectSec(companies: Company[], since: string): Promise<Item[]> {
  const out: Item[] = [];
  for (const c of companies.filter((x) => x.cik)) {
    try {
      const res = await get(`https://data.sec.gov/submissions/CIK${c.cik}.json`);
      if (!res.ok) continue;
      const j = (await res.json()) as { filings: { recent: Record<string, string[]> } };
      const r = j.filings.recent;
      for (let i = 0; i < r.form.length; i++) {
        if (r.filingDate[i] < since) break; // newest first
        const form = r.form[i];
        if (!FORMS.has(form)) continue;
        if (form === "8-K" && !DEAL_ITEMS.test(r.items[i] ?? "")) continue;
        const acc = r.accessionNumber[i].replace(/-/g, "");
        const base = `https://www.sec.gov/Archives/edgar/data/${Number(c.cik)}/${acc}`;
        const extra: string[] = [];
        if (form === "8-K" || form === "6-K") {
          const idx = await get(`${base}/index.json`);
          if (idx.ok) {
            const files = ((await idx.json()) as { directory: { item: { name: string }[] } }).directory.item.map((x) => x.name);
            for (const f of files) if (/ex-?99|ex99|dex99/i.test(f) && /\.html?$/i.test(f)) extra.push(`${base}/${f}`);
          }
        }
        out.push({
          id: `${base}/${r.primaryDocument[i]}`,
          title: `${c.name} filed a ${form}${r.items[i] ? ` (items ${r.items[i]})` : ""}: ${r.primaryDocDescription[i] || ""}`.trim(),
          url: `${base}/${r.primaryDocument[i]}`,
          date: r.filingDate[i],
          origin: "sec",
          company: c.id,
          extraUrls: extra.slice(0, 2),
        });
      }
    } catch {
      // one company's feed failing must not stop the run
    }
  }
  return out;
}

/** Minimal RSS 2.0 / Atom reader. */
export function parseFeed(xml: string): { title: string; link: string; date: string }[] {
  const items: { title: string; link: string; date: string }[] = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  const tag = (b: string, t: string) => {
    const m = b.match(new RegExp(`<${t}\\b[^>]*>([\\s\\S]*?)</${t}>`, "i"));
    return m ? decodeEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim()) : "";
  };
  for (const b of blocks) {
    const link = tag(b, "link") || (b.match(/<link\b[^>]*href="([^"]+)"/i)?.[1] ?? "");
    const raw = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date");
    const d = new Date(raw);
    if (!link) continue;
    items.push({ title: tag(b, "title").replace(/<[^>]+>/g, ""), link: link.trim(), date: Number.isNaN(d.getTime()) ? "" : ISO(d) });
  }
  return items;
}

export async function collectNewsrooms(companies: Company[], since: string): Promise<Item[]> {
  const out: Item[] = [];
  for (const c of companies.filter((x) => x.newsroom_feed)) {
    try {
      const res = await get(c.newsroom_feed!);
      if (!res.ok) continue;
      for (const it of parseFeed(await res.text())) {
        if (it.date && it.date < since) continue;
        out.push({ id: it.link, title: `${c.name}: ${it.title}`, url: it.link, date: it.date || ISO(new Date()), origin: "newsroom", company: c.id });
      }
    } catch {}
  }
  return out;
}

/** News search via the free GDELT DOC API (returns direct article links). */
export const NEWS_QUERIES = [
  '"data center" (billion OR gigawatt) (AI OR "artificial intelligence")',
  '"power purchase agreement" ("data center" OR "data centers")',
  '(invest OR investment OR stake) billion (OpenAI OR Anthropic OR xAI OR Nvidia OR CoreWeave)',
  '(contract OR agreement) billion (GPU OR GPUs OR "AI chips" OR accelerators)',
  '("cloud contract" OR "cloud computing deal" OR "compute deal") billion',
  '(acquire OR acquisition) billion ("data center" OR semiconductor OR AI)',
];

export async function collectNews(timespan = "1d"): Promise<Item[]> {
  const out: Item[] = [];
  for (const q of NEWS_QUERIES) {
    try {
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q + " sourcelang:english")}&mode=artlist&maxrecords=75&timespan=${timespan}&format=json&sort=datedesc`;
      let text = "";
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await get(url);
        text = res.ok ? await res.text() : "";
        if (text.startsWith("{")) break;
        await new Promise((r) => setTimeout(r, 20000)); // throttled: wait and retry once
      }
      if (!text.startsWith("{")) continue;
      const j = JSON.parse(text) as { articles?: { url: string; title: string; seendate: string }[] };
      for (const a of j.articles ?? []) {
        const d = a.seendate.replace(/^(\d{4})(\d{2})(\d{2}).*/, "$1-$2-$3");
        out.push({ id: a.url, title: a.title, url: a.url, date: d, origin: "news" });
      }
      await new Promise((r) => setTimeout(r, 10000)); // GDELT asks for at most one request every 5 seconds
    } catch {}
  }
  return out;
}

/** Drop items already seen in earlier runs and repeated headlines. */
export function dedupeItems(items: Item[], seen: Set<string>): Item[] {
  const titles = new Set<string>();
  return items.filter((i) => {
    const t = i.title.toLowerCase().replace(/\W+/g, " ").trim();
    if (seen.has(i.id) || titles.has(t)) return false;
    titles.add(t);
    return true;
  });
}
