/**
 * Fill company revenue from SEC EDGAR XBRL "company facts" (free, no key; sec.gov
 * requires contact info in the User-Agent). Only companies with a `cik` and either no
 * revenue or revenue that this script wrote before (publisher "SEC EDGAR (XBRL)") are touched.
 *   npx tsx scripts/import-sec.ts
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, writeJson } from "../src/lib/data-fs";
import { CompanySchema, type Company } from "../src/lib/schema";

const CONTACT = process.env.SEC_CONTACT ?? "sebastianappel12@gmail.com";
const UA = `AI Atlas research ${CONTACT}`;
const PUBLISHER = "SEC EDGAR (XBRL)";
const CONCEPTS: [string, string][] = [
  ["us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax"],
  ["us-gaap", "Revenues"],
  ["us-gaap", "RevenueFromContractWithCustomerIncludingAssessedTax"],
  ["us-gaap", "SalesRevenueNet"],
  ["us-gaap", "RegulatedAndUnregulatedOperatingRevenue"],
  ["us-gaap", "ElectricUtilityRevenue"],
  ["ifrs-full", "Revenue"],
];

interface Fact { start?: string; end: string; val: number; accn: string; fy?: number; fp?: string; form: string; filed: string }
interface Facts { facts: Record<string, Record<string, { units: Record<string, Fact[]> }>> }

let last = 0;
async function getFacts(cik: string): Promise<Facts | null> {
  const wait = 150 - (Date.now() - last); // SEC asks for <= 10 requests/second
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers: { "User-Agent": UA } });
  return res.ok ? ((await res.json()) as Facts) : null;
}

const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

/** Latest full-year revenue from an annual report (10-K / 20-F / 40-F). */
function latestAnnualRevenue(f: Facts): { fact: Fact; concept: string; unit: string } | null {
  let best: { fact: Fact; concept: string; unit: string } | null = null;
  for (const [ns, name] of CONCEPTS) {
    const units = f.facts[ns]?.[name]?.units;
    if (!units) continue;
    for (const [unit, list] of Object.entries(units)) {
      for (const x of list) {
        if (!/^(10-K|20-F|40-F)/.test(x.form) || !x.start) continue;
        const len = days(x.start, x.end);
        if (len < 350 || len > 380) continue;
        if (!best || x.end > best.fact.end || (x.end === best.fact.end && unit === "USD" && best.unit !== "USD"))
          best = { fact: x, concept: `${ns}:${name}`, unit };
      }
    }
  }
  return best;
}

const dir = path.join(ROOT, "data/companies");
let updated = 0;
const skipped: string[] = [];
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const full = path.join(dir, file);
  const c = JSON.parse(fs.readFileSync(full, "utf8")) as Company;
  if (!c.cik) continue;
  if (c.revenue && c.revenue.source.publisher !== PUBLISHER) continue;
  const facts = await getFacts(c.cik);
  const hit = facts && latestAnnualRevenue(facts);
  if (!hit) {
    skipped.push(`${c.id} (no annual revenue in XBRL)`);
    continue;
  }
  if (hit.unit !== "USD") {
    skipped.push(`${c.id} (revenue reported in ${hit.unit}; add it by hand with a converted amount)`);
    continue;
  }
  const { fact } = hit;
  const accn = fact.accn.replace(/-/g, "");
  const fy = fact.end.slice(0, 4);
  c.revenue = {
    amount_usd: fact.val,
    period: `FY${fact.fy && fact.fp === "FY" && String(fact.fy) !== fy ? fact.fy : fy} (ended ${fact.end})`,
    as_of: fact.end,
    estimate: false,
    source: {
      url: `https://www.sec.gov/Archives/edgar/data/${Number(c.cik)}/${accn}/`,
      publisher: PUBLISHER,
      date: fact.filed,
      kind: "sec_filing",
      quote: `${hit.concept} = ${fact.val.toLocaleString("en-US")} USD for ${fact.start} to ${fact.end} (${fact.form}, accession ${fact.accn}).`,
    },
  };
  writeJson(full, CompanySchema.parse(c));
  updated++;
}
console.log(`SEC import: updated revenue for ${updated} companies`);
if (skipped.length) console.log("skipped:\n  " + skipped.join("\n  "));
