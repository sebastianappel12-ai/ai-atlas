/**
 * Daily agent steps 4-5: run the code checks on one proposed deal and route it.
 *   npx tsx scripts/propose-deal.ts path/to/candidate.json [--update-of <existing-id>]
 *   AGENT_INBOX_REF=origin/agent-inbox npx tsx scripts/propose-deal.ts …   # cloud agent: check quotes against saved pages
 *
 * The candidate is a Deal record (see src/lib/schema.ts); id, added, last_checked, source kind
 * and publisher are filled in here. Checks (code, not AI):
 *   a. the quote really appears on the source page
 *   b. it isn't a duplicate of a deal we already have
 *   c. the amount is sensible for these two companies
 *   d. the whole dataset still passes check-data
 * Then: official source + every check passed -> written to data/deals + changelog ("auto");
 *       otherwise -> .queue/queue.json for a review pull request; failed quote/schema/duplicate -> dropped.
 * Prints PUBLISH / REVIEW / DROP with reasons. Exit code 0 unless the input is unreadable.
 */
import fs from "node:fs";
import path from "node:path";
import { checkAmount, checkDate, checkQuoteOnPage, classifySource, decide, findDuplicate, makeDealId } from "../src/lib/agent/checks";
import { checkData } from "../src/lib/check";
import { readPlantIds, readRaw, ROOT, writeJson } from "../src/lib/data-fs";
import { INBOX_REF, inboxPageText } from "../src/lib/inbox";
import { fetchPageText } from "../src/lib/quote";
import { ChangelogSchema, DealSchema, type Changelog, type Deal } from "../src/lib/schema";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const updateOf = args.includes("--update-of") ? args[args.indexOf("--update-of") + 1] : null;
if (!file) {
  console.error("usage: npx tsx scripts/propose-deal.ts candidate.json [--update-of <id>]");
  process.exit(2);
}
const today = new Date().toISOString().slice(0, 10);
const raw = readRaw();
const base = checkData({ ...raw, plantIds: readPlantIds() });
const byId = new Map(base.companies.map((c) => [c.id, c]));
const input = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<Deal>;

const from = byId.get(input.from ?? "");
const to = byId.get(input.to ?? "");
if (!from || !to) {
  console.log(`DROP: unknown company (${!from ? input.from : input.to}); only tracked company ids are allowed`);
  process.exit(0);
}
if (updateOf && !base.deals.some((d) => d.id === updateOf)) {
  console.log(`DROP: --update-of ${updateOf} is not an existing deal`);
  process.exit(0);
}

const queuePath = path.join(ROOT, ".queue/queue.json");
const queue = fs.existsSync(queuePath) ? (JSON.parse(fs.readFileSync(queuePath, "utf8")) as { date: string; items: { deal: Deal; reasons: string[]; updateOf: string | null }[] }) : { date: today, items: [] };
const taken = new Set([...base.deals.map((d) => d.id), ...queue.items.map((q) => q.deal.id)]);

const sources = (input.sources ?? []).map((s) => {
  const kind = classifySource(s.url, [from, to]);
  return { ...s, kind, publisher: s.publisher || new URL(s.url).hostname.replace(/^www\./, ""), date: s.date || today };
});
const deal = {
  ...input,
  id: input.id && !taken.has(input.id) ? input.id : makeDealId(input.from!, input.to!, input.type!, input.date!, taken),
  ...(input.amount_usd === null || input.amount_usd === undefined ? { amount_usd: null, amount_kind: "undisclosed" } : {}),
  ...(updateOf ? { supersedes: updateOf } : {}),
  sources,
  confidence: sources.every((s) => s.kind === "news") && input.confidence === "high" ? "medium" : input.confidence,
  last_checked: today,
  added: today,
} as Deal;

// (a) quote on page — every source must verify
let quote = { ok: true } as { ok: boolean; reason?: string };
for (const s of deal.sources) {
  // In the cloud the agent can't reach the web: use the page the GitHub Action saved (read from git).
  let text: string | undefined = inboxPageText(s.url);
  if (text === undefined) {
    try {
      const r = await fetchPageText(s.url);
      text = r.http < 400 ? r.text : undefined;
    } catch {}
  }
  if (text === undefined && INBOX_REF) {
    quote = { ok: false, reason: `source page not in the inbox (${INBOX_REF}) and unreachable: ${s.url}` };
    break;
  }
  const r = checkQuoteOnPage(text, s.quote);
  if (!r.ok) {
    quote = { ok: false, reason: `${r.reason}: ${s.url}` };
    break;
  }
}
// (d) schema + whole-dataset check
const parsed = DealSchema.safeParse(deal);
const trial = parsed.success ? checkData({ ...raw, deals: [...raw.deals, { file: `data/deals/${deal.id}.json`, data: deal }], plantIds: readPlantIds() }) : null;
const schemaErr = !parsed.success ? parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : trial!.errors.filter((e) => e.file.endsWith(`${deal.id}.json`)).map((e) => e.message).join("; ");

const { decision, reasons } = decide({
  quote,
  duplicate: findDuplicate(deal, [...base.deals, ...queue.items.map((q) => q.deal)]), // (b)
  isUpdate: Boolean(updateOf),
  amount: checkAmount(deal.amount_usd, from, to), // (c)
  date: checkDate(deal.date, today),
  schema: schemaErr ? { ok: false, reason: schemaErr } : { ok: true },
  official: deal.sources.some((s) => s.kind !== "news"),
});

if (decision === "publish") {
  writeJson(path.join(ROOT, "data/deals", `${deal.id}.json`), parsed.success ? parsed.data : deal);
  const logFile = path.join(ROOT, "data/changelog", `${today}.json`);
  const log: Changelog = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, "utf8")) : { date: today, entries: [] };
  log.entries.push({ kind: "added", record: "deal", id: deal.id, summary: deal.title, via: "auto" });
  writeJson(logFile, ChangelogSchema.parse(log));
  console.log(`PUBLISH: ${deal.id} written to data/deals (official source, all checks passed)`);
} else if (decision === "review") {
  queue.items.push({ deal, reasons, updateOf });
  writeJson(queuePath, queue);
  console.log(`REVIEW: ${deal.id} queued for a pull request — ${reasons.join("; ")}`);
} else {
  console.log(`DROP: ${reasons.join("; ")}`);
}
