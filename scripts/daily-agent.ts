/**
 * The daily update agent. Every morning (GitHub Actions, ~6 a.m. Eastern):
 *   1. Collect   new SEC filings, company newsroom feeds and news (no AI)
 *   2. Sort      Claude Haiku 5.5 reads each headline: new deal, change to one we have, or irrelevant
 *   3. Extract   Claude Sonnet 5.5 reads each remaining article and fills in the deal form,
 *                copying the exact sentence that proves it
 *   4. Check     code (not AI): quote on page? duplicate? sensible amount? passes check-data?
 *   5. Publish   official source + every check passed -> data/deals (site rebuilds itself);
 *                everything else -> .queue/ (the workflow turns it into a pull request to approve)
 *   6. Extras    plain-English explanation (written in step 3) + "What changed today" entries
 *
 *   npx tsx scripts/daily-agent.ts [--since 2026-10-25] [--dry-run] [--max-extract 15]
 * Needs ANTHROPIC_API_KEY (except --collect-only). Spend is logged to data/generated/agent-costs.json.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { checkAmount, checkDate, checkQuoteOnPage, classifySource, decide, findDuplicate, makeDealId, relevantPassages, type Decision } from "../src/lib/agent/checks";
import { collectNews, collectNewsrooms, collectSec, dedupeItems, type Item } from "../src/lib/agent/collect";
import { checkData } from "../src/lib/check";
import { readPlantIds, readRaw, ROOT, writeJson } from "../src/lib/data-fs";
import { fetchPageText } from "../src/lib/quote";
import { AMOUNT_KINDS, ChangelogSchema, DEAL_STATUSES, DEAL_TYPES, DealSchema, type Changelog, type Company, type Deal } from "../src/lib/schema";

const SORT_MODEL = "claude-haiku-5-5";
const EXTRACT_MODEL = "claude-sonnet-5-5";
/** $ per million tokens (Anthropic list prices, October 2026). */
const PRICE = { [SORT_MODEL]: { in: 0.1, out: 0.5 }, [EXTRACT_MODEL]: { in: 2, out: 10 } } as const;

const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const dryRun = args.includes("--dry-run");
const collectOnly = args.includes("--collect-only");
const maxExtract = Number(arg("--max-extract") ?? 15);
const today = new Date().toISOString().slice(0, 10);
const since = arg("--since") ?? new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
const MONTHLY_CAP_USD = Number(process.env.AGENT_MONTHLY_CAP_USD ?? 18); // the plan's budget is $20/month

const COSTS = path.join(ROOT, "data/generated/agent-costs.json");
const SEEN = path.join(ROOT, "data/generated/agent-seen.json");
const QUEUE = path.join(ROOT, ".queue");

// ---------- state ----------
const raw = readRaw();
const base = checkData({ ...raw, plantIds: readPlantIds() });
if (base.errors.length) throw new Error(`check-data fails before the run (${base.errors.length} errors); fix the data first`);
const companies = base.companies;
const deals = base.deals;
const byId = new Map(companies.map((c) => [c.id, c]));
const seen = new Set<string>(fs.existsSync(SEEN) ? JSON.parse(fs.readFileSync(SEEN, "utf8")).ids : []);
const costLog = fs.existsSync(COSTS) ? (JSON.parse(fs.readFileSync(COSTS, "utf8")) as { runs: Run[] }) : { runs: [] as Run[] };
interface Run { date: string; items: number; sorted: number; extracted: number; published: number; queued: number; dropped: number; usage: Record<string, { in: number; out: number }>; usd: number }
const run: Run = { date: today, items: 0, sorted: 0, extracted: 0, published: 0, queued: 0, dropped: 0, usage: {}, usd: 0 };
const monthSpent = () => costLog.runs.filter((r) => r.date.slice(0, 7) === today.slice(0, 7)).reduce((s, r) => s + r.usd, 0) + run.usd;

const client = collectOnly ? null : new Anthropic();
function track(model: keyof typeof PRICE, usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null }) {
  const u = (run.usage[model] ??= { in: 0, out: 0 });
  const inTok = usage.input_tokens + (usage.cache_read_input_tokens ?? 0);
  u.in += inTok;
  u.out += usage.output_tokens;
  run.usd += (inTok * PRICE[model].in + usage.output_tokens * PRICE[model].out) / 1e6;
}

const roster = companies.map((c) => `${c.id} = ${c.name}${c.aliases.length ? ` (${c.aliases.join(", ")})` : ""} [${c.sector}]`).join("\n");

// ---------- 1. collect ----------
console.log(`collecting since ${since}…`);
const collected = dedupeItems([...(await collectSec(companies, since)), ...(await collectNewsrooms(companies, since)), ...(await collectNews(since < today ? "2d" : "1d"))], seen);
run.items = collected.length;
console.log(`  ${collected.length} new items`);
if (collectOnly) {
  for (const i of collected.slice(0, 40)) console.log(`  [${i.origin}] ${i.date} ${i.title}`);
  process.exit(0);
}

// ---------- 2. sort (Haiku) ----------
const SortSchema = z.object({
  items: z.array(z.object({ i: z.number().int(), verdict: z.enum(["new_deal", "deal_update", "irrelevant"]), companies: z.array(z.string()) })),
});
const toExtract: (Item & { verdict: string; companies: string[] })[] = [];
for (let start = 0; start < collected.length; start += 60) {
  const batch = collected.slice(start, start + 60);
  const res = await client!.messages.parse({
    model: SORT_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(SortSchema) },
    system: [
      {
        type: "text",
        text:
          "You triage headlines for AI Atlas, a database of money moving between AI-industry companies: investments, acquisitions, chip orders, cloud contracts, power deals, supply deals, data center leases, loans and licensing.\n" +
          "For each numbered headline answer one question: is this a NEW deal between two companies, a CHANGE to a deal (revised, expanded, canceled, completed), or IRRELEVANT? " +
          "Most items are irrelevant (earnings, products, people, opinion, routine filings). A deal needs money moving between two named companies.\n" +
          "List the tracked company ids involved (only ids from this list):\n" +
          roster,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: batch.map((it, k) => `${k}. ${it.title}`).join("\n") }],
  });
  track(SORT_MODEL, res.usage);
  for (const r of res.parsed_output?.items ?? []) {
    const it = batch[r.i];
    if (!it || r.verdict === "irrelevant") continue;
    const ids = r.companies.filter((x) => byId.has(x));
    if (ids.length === 0) continue;
    toExtract.push({ ...it, verdict: r.verdict, companies: ids });
  }
  run.sorted += batch.length;
}
// Official sources first; then cap the number of articles read per day.
toExtract.sort((a, b) => (a.origin === "news" ? 1 : 0) - (b.origin === "news" ? 1 : 0));
console.log(`  ${toExtract.length} candidate items after sorting`);

// ---------- 3. extract (Sonnet) ----------
const ExtractSchema = z.object({
  deals: z.array(
    z.object({
      update_of: z.string().nullable().describe("id of the existing deal this changes, or null for a new deal"),
      from: z.string().describe("tracked company id that PAYS"),
      to: z.string().describe("tracked company id that GETS PAID"),
      type: z.enum(DEAL_TYPES),
      title: z.string(),
      amount_usd: z.number().nullable(),
      amount_kind: z.enum(AMOUNT_KINDS),
      date: z.string().describe("YYYY-MM-DD the deal was announced or signed"),
      length_years: z.number().nullable(),
      status: z.enum(DEAL_STATUSES),
      source_url: z.string().describe("one of the document URLs given"),
      quote: z.string().describe("ONE sentence copied character-for-character from that document"),
      explain: z.string().describe("1-3 plain-English sentences for someone who doesn't invest"),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
});

const RULES = `Rules you must follow:
1. Lines point the way money moves: "from" pays, "to" gets paid. Investment: investor -> company. Chip order: buyer -> chip maker. Cloud contract: AI lab -> cloud. Power deal: data center owner -> power company. Lease: tenant -> landlord. Loan: lender -> borrower. Acquisition: buyer -> company bought.
2. amount_kind: "confirmed" only for a firm number stated by the companies or a filing; "up_to" for ceilings ("up to", "as much as"); "estimated" for numbers from reporters/analysts; "undisclosed" with amount_usd null when no number is given. Never invent a number. Whole US dollars.
3. quote must be ONE sentence copied exactly from the document text you were given — never paraphrase, never stitch sentences. If you cannot quote a sentence that proves the deal, return no deal.
4. Only use company ids from the list. If a party isn't tracked, return no deal.
5. If it's a change to an existing deal listed below, set update_of to that id and describe the NEW version.
6. Most documents contain no qualifying deal; return an empty list then.`;

interface Candidate { deal: Deal; decision: Decision; reasons: string[]; updateOf: string | null; item: Item }
const candidates: Candidate[] = [];
const pageCache = new Map<string, string | undefined>();
async function page(url: string) {
  if (!pageCache.has(url)) {
    try {
      const r = await fetchPageText(url);
      pageCache.set(url, r.http < 400 ? r.text : undefined);
    } catch {
      pageCache.set(url, undefined);
    }
  }
  return pageCache.get(url);
}

for (const it of toExtract.slice(0, maxExtract)) {
  if (monthSpent() >= MONTHLY_CAP_USD) {
    console.warn(`monthly cap $${MONTHLY_CAP_USD} reached; stopping extraction`);
    break;
  }
  const urls = [it.url, ...(it.extraUrls ?? [])];
  const docs: { url: string; text: string }[] = [];
  for (const u of urls) {
    const t = await page(u);
    if (t) docs.push({ url: u, text: relevantPassages(t.replace(/\s+/g, " "), it.companies.map((c) => byId.get(c)!.name), 30000) });
  }
  if (!docs.length) {
    run.dropped++;
    continue;
  }
  const related = deals.filter((d) => it.companies.includes(d.from) || it.companies.includes(d.to)).slice(-40);
  const res = await client!.messages.parse({
    model: EXTRACT_MODEL,
    max_tokens: 6000,
    output_config: { effort: "medium", format: zodOutputFormat(ExtractSchema) },
    system: [
      { type: "text", text: `You fill in deal records for AI Atlas from source documents. Accuracy matters more than coverage: one made-up deal destroys the site's trust.\n\n${RULES}\n\nTracked companies:\n${roster}`, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content:
          `Existing deals involving these companies (for duplicates and updates):\n${related.map((d) => `${d.id}: ${d.title} (${d.date}, ${d.amount_kind} ${d.amount_usd ?? "n/a"}, ${d.status})`).join("\n") || "(none)"}\n\n` +
          docs.map((d) => `<document url="${d.url}">\n${d.text}\n</document>`).join("\n\n") +
          `\n\nToday is ${today}. Extract the deals.`,
      },
    ],
  });
  track(EXTRACT_MODEL, res.usage);
  run.extracted++;
  if (res.stop_reason === "refusal") continue;

  for (const x of res.parsed_output?.deals ?? []) {
    const from = byId.get(x.from);
    const to = byId.get(x.to);
    if (!from || !to || !urls.includes(x.source_url)) {
      run.dropped++;
      continue;
    }
    const kind = classifySource(x.source_url, [from, to]);
    const taken = new Set([...deals.map((d) => d.id), ...candidates.map((c) => c.deal.id)]);
    const deal: Deal = {
      id: makeDealId(x.from, x.to, x.type, x.date, taken),
      from: x.from,
      to: x.to,
      type: x.type,
      title: x.title.slice(0, 140),
      amount_usd: x.amount_kind === "undisclosed" ? null : x.amount_usd,
      amount_kind: x.amount_usd === null ? "undisclosed" : x.amount_kind,
      date: x.date,
      ...(x.length_years ? { length_years: x.length_years } : {}),
      status: x.status,
      ...(x.update_of && deals.some((d) => d.id === x.update_of) ? { supersedes: x.update_of } : {}),
      sources: [{ url: x.source_url, publisher: kind === "sec_filing" ? "SEC EDGAR" : kind === "press_release" ? `${from.website && x.source_url.includes(new URL(from.website).hostname.replace(/^www\./, "")) ? from.name : to.name} newsroom` : new URL(x.source_url).hostname.replace(/^www\./, ""), date: it.date, kind, quote: x.quote.trim() }],
      confidence: kind === "news" && x.confidence === "high" ? "medium" : x.confidence,
      last_checked: today,
      added: today,
      explain: x.explain,
    };

    // ---------- 4. check (code) ----------
    const parsed = DealSchema.safeParse(deal);
    const trial = parsed.success
      ? checkData({ ...raw, deals: [...raw.deals, { file: `data/deals/${deal.id}.json`, data: deal }], plantIds: readPlantIds() })
      : null;
    const schemaReason = !parsed.success ? parsed.error.issues[0]?.message : trial!.errors.find((e) => e.file.endsWith(`${deal.id}.json`))?.message;
    const { decision, reasons } = decide({
      quote: checkQuoteOnPage(await page(x.source_url), deal.sources[0].quote),
      duplicate: findDuplicate(deal, [...deals, ...candidates.map((c) => c.deal)]),
      isUpdate: Boolean(deal.supersedes),
      amount: checkAmount(deal.amount_usd, from, to),
      date: checkDate(deal.date, today),
      schema: schemaReason ? { ok: false, reason: schemaReason } : { ok: true },
      official: kind !== "news",
    });
    candidates.push({ deal, decision, reasons, updateOf: deal.supersedes ?? null, item: it });
  }
}

// ---------- 5 + 6. publish or queue, write the changelog ----------
const changelogFile = path.join(ROOT, "data/changelog", `${today}.json`);
const changelog: Changelog = fs.existsSync(changelogFile) ? JSON.parse(fs.readFileSync(changelogFile, "utf8")) : { date: today, entries: [] };
const queue: { deal: Deal; reasons: string[]; updateOf: string | null; headline: string }[] = [];
for (const c of candidates) {
  if (c.decision === "drop") {
    run.dropped++;
    console.log(`  drop    ${c.deal.title} — ${c.reasons.join("; ")}`);
  } else if (c.decision === "publish") {
    run.published++;
    console.log(`  publish ${c.deal.id}`);
    if (!dryRun) writeJson(path.join(ROOT, "data/deals", `${c.deal.id}.json`), c.deal);
    changelog.entries.push({ kind: "added", record: "deal", id: c.deal.id, summary: c.deal.title, via: "auto" });
  } else {
    run.queued++;
    console.log(`  review  ${c.deal.id} — ${c.reasons.join("; ")}`);
    queue.push({ deal: c.deal, reasons: c.reasons, updateOf: c.updateOf, headline: c.item.title });
  }
}

for (const it of collected) seen.add(it.id);
costLog.runs.push(run);
console.log(`run: ${run.items} items, ${run.extracted} read, ${run.published} published, ${run.queued} for review, ${run.dropped} dropped — $${run.usd.toFixed(3)} today, $${monthSpent().toFixed(2)} this month`);
if (dryRun) process.exit(0);

if (changelog.entries.length) writeJson(changelogFile, ChangelogSchema.parse(changelog));
writeJson(SEEN, { ids: [...seen].slice(-20000) });
writeJson(COSTS, { note: "Claude API spend by the daily agent (list prices). Month-to-date must stay under $20.", runs: costLog.runs.slice(-400) });
fs.rmSync(QUEUE, { recursive: true, force: true });
if (queue.length) {
  writeJson(path.join(QUEUE, "queue.json"), { date: today, items: queue });
  const md = [
    `## Daily agent: ${queue.length} deal(s) waiting for your approval (${today})`,
    "",
    "Merge this PR to publish them; close it to reject. Edit the JSON files to fix anything first.",
    "",
    ...queue.map((q) => {
      const s = q.deal.sources[0];
      return [
        `### ${q.deal.title}`,
        `- **${byId.get(q.deal.from)?.name} → ${byId.get(q.deal.to)?.name}** · ${q.deal.type} · ${q.deal.amount_kind} ${q.deal.amount_usd ?? "undisclosed"} · ${q.deal.date} · ${q.deal.status}`,
        `- Why it needs review: ${q.reasons.join("; ")}`,
        q.updateOf ? `- Replaces: \`${q.updateOf}\` (will be marked revised)` : "",
        `- Source: ${s.url}`,
        `- Quote (verified on the page): "${s.quote}"`,
        "",
      ]
        .filter(Boolean)
        .join("\n");
    }),
  ].join("\n");
  fs.writeFileSync(path.join(QUEUE, "PR_BODY.md"), md);
}
