/**
 * The daily agent's code checks (step 4). No AI here: these decide whether an
 * extracted deal is published automatically, sent to human review, or dropped.
 */
import { quoteAppearsIn } from "../quote";
import type { Company, Deal, Source } from "../schema";

export interface CheckOutcome {
  ok: boolean;
  reason?: string;
}

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** a.b.example.com belongs to example.com */
const sameSite = (h: string, site: string) => h === site || h.endsWith(`.${site}`);

/**
 * Official = an SEC filing, or a press release on one of the two companies' own websites.
 * News outlets and wire services aren't official for auto-publishing; they go to review.
 */
export function classifySource(url: string, parties: Company[]): Source["kind"] {
  const h = host(url);
  if (sameSite(h, "sec.gov")) return "sec_filing";
  for (const c of parties) {
    if (c.website && sameSite(h, host(c.website))) return "press_release";
    if (c.newsroom_feed && sameSite(h, host(c.newsroom_feed))) return "press_release";
  }
  return "news";
}

/** (a) Does the copied quote really appear on the source page? This is what stops made-up deals. */
export function checkQuoteOnPage(pageText: string | undefined, quote: string): CheckOutcome {
  if (!pageText) return { ok: false, reason: "source page could not be fetched" };
  return quoteAppearsIn(pageText, quote) ? { ok: true } : { ok: false, reason: "quote not found on the source page" };
}

/** (b) Is it a duplicate of a deal we already have? */
export function findDuplicate(c: Pick<Deal, "from" | "to" | "type" | "date" | "amount_usd" | "sources">, deals: Deal[]): Deal | undefined {
  const t = Date.parse(c.date);
  return deals.find((d) => {
    if (d.sources.some((s) => c.sources.some((x) => x.url === s.url && x.quote === s.quote))) return true;
    if (d.from !== c.from || d.to !== c.to || d.type !== c.type) return false;
    if (Math.abs(Date.parse(d.date) - t) > 45 * 864e5) return false;
    if (d.amount_usd === null || c.amount_usd === null) return true;
    return Math.abs(d.amount_usd - c.amount_usd) / Math.max(d.amount_usd, c.amount_usd) < 0.25;
  });
}

/**
 * (c) Is the amount sensible for these two companies? Multi-year contracts can be many times
 * a buyer's annual revenue (OpenAI -> Oracle), so the ceiling is generous; it exists to catch
 * unit slips (billions read as trillions) and hallucinated zeros.
 */
export function checkAmount(amount: number | null, from: Company, to: Company): CheckOutcome {
  if (amount === null) return { ok: true };
  if (amount < 1e6) return { ok: false, reason: `amount $${amount} is under $1M (unit slip?)` };
  if (amount > 2e12) return { ok: false, reason: "amount is over $2 trillion" };
  const scale = Math.max(
    ...[from, to].flatMap((c) => [(c.revenue?.amount_usd ?? 0) * 25, (c.valuation?.amount_usd ?? 0) * 1.5, (c.backlog?.amount_usd ?? 0) * 1.5]),
  );
  if (scale === 0) return { ok: false, reason: "no revenue/valuation on file to sanity-check the amount" };
  if (amount > scale) return { ok: false, reason: `amount ${amount.toExponential(2)} is far above both companies' size` };
  return { ok: true };
}

/** A date the agent can't trust: in the future, or impossibly old. */
export function checkDate(date: string, today: string): CheckOutcome {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, reason: "bad date" };
  if (date > today) return { ok: false, reason: "date is in the future" };
  if (date < "2019-01-01") return { ok: false, reason: "date is before 2019" };
  return { ok: true };
}

export type Decision = "publish" | "review" | "drop";

/** Step 5: publish only official + every check passed; otherwise review; drop duplicates and fakes. */
export function decide(input: {
  quote: CheckOutcome;
  duplicate: Deal | undefined;
  isUpdate: boolean;
  amount: CheckOutcome;
  date: CheckOutcome;
  schema: CheckOutcome;
  official: boolean;
}): { decision: Decision; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.quote.ok) return { decision: "drop", reasons: [input.quote.reason!] };
  if (!input.schema.ok) return { decision: "drop", reasons: [`check-data: ${input.schema.reason}`] };
  if (input.duplicate && !input.isUpdate) return { decision: "drop", reasons: [`duplicate of ${input.duplicate.id}`] };
  if (!input.amount.ok) reasons.push(input.amount.reason!);
  if (!input.date.ok) reasons.push(input.date.reason!);
  if (!input.official) reasons.push("not an official source");
  if (input.isUpdate) reasons.push("changes an existing deal");
  return reasons.length ? { decision: "review", reasons } : { decision: "publish", reasons: [] };
}

/** id like "openai-oracle-cloud-2025", made unique against existing ids. */
export function makeDealId(from: string, to: string, type: Deal["type"], date: string, taken: Set<string>): string {
  const short: Record<Deal["type"], string> = {
    investment: "investment", acquisition: "acquisition", chip_order: "chips", cloud_contract: "cloud", power_deal: "power",
    supply: "supply", data_center: "datacenter", financing: "financing", licensing: "license",
  };
  const base = `${from}-${to}-${short[type]}-${date.slice(0, 4)}`;
  if (!taken.has(base)) return base;
  const month = `${base}-${date.slice(5, 7)}`;
  if (!taken.has(month)) return month;
  for (let i = 2; ; i++) if (!taken.has(`${month}-${i}`)) return `${month}-${i}`;
}

/** Pick the passages of a long document that mention deal words or tracked companies. */
export function relevantPassages(text: string, names: string[], maxChars = 30000): string {
  if (text.length <= maxChars) return text;
  const words = ["billion", "million", "agreement", "contract", "invest", "acquire", "purchase", "commit", "lease", "power", "gigawatt", "megawatt", ...names.map((n) => n.toLowerCase())];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const scored = sentences.map((s, i) => ({ i, s, score: words.reduce((n, w) => n + (s.toLowerCase().includes(w) ? 1 : 0), 0) }));
  const keep = new Set<number>();
  for (const x of [...scored].sort((a, b) => b.score - a.score)) {
    if (x.score === 0) break;
    for (const j of [x.i - 1, x.i, x.i + 1]) if (j >= 0 && j < sentences.length) keep.add(j);
    if ([...keep].reduce((n, j) => n + sentences[j].length, 0) > maxChars) break;
  }
  return [...keep].sort((a, b) => a - b).map((j) => sentences[j]).join(" ").slice(0, maxChars);
}
