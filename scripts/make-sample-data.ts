/**
 * Phase 0 fake sample data: 10 made-up companies and 15 made-up deals, so the
 * screens can be built before the real data exists. Every source points at
 * example.com and says "Sample data" so nobody mistakes it for real.
 *   npx tsx scripts/make-sample-data.ts
 */
import path from "node:path";
import { ROOT, writeJson } from "../src/lib/data-fs";
import type { Company, Deal, Sector } from "../src/lib/schema";

const today = "2026-10-26";
const src = (slug: string, date: string, quote: string) => ({
  url: `https://example.com/sample/${slug}`,
  publisher: "Sample Wire",
  date,
  kind: "press_release" as const,
  quote: `Sample data: ${quote}`,
});

const companies: [string, string, Sector, boolean, number][] = [
  ["nimbus-labs", "Nimbus Labs", "ai_lab", false, 12e9],
  ["stratus-cloud", "Stratus Cloud", "cloud", true, 240e9],
  ["gridline-gpu", "Gridline GPU", "neocloud", true, 5e9],
  ["quark-silicon", "Quark Silicon", "chip_designer", true, 130e9],
  ["forge-fab", "Forge Fab", "chip_factory", true, 90e9],
  ["recall-memory", "Recall Memory", "memory", true, 30e9],
  ["lattice-networks", "Lattice Networks", "networking", true, 8e9],
  ["hall-data-centers", "Hall Data Centers", "dc_builder", true, 6e9],
  ["meridian-power", "Meridian Power", "power", true, 18e9],
  ["summit-capital", "Summit Capital", "investor", false, 1e9],
];

const outCompanies: Company[] = companies.map(([id, name, sector, isPublic, revenue], i) => ({
  id,
  name,
  sector,
  public: isPublic,
  ...(isPublic ? { ticker: `SAMPLE:S${i}` } : {}),
  country: "US",
  hq_state: ["CA", "WA", "NJ", "CA", "AZ", "ID", "CA", "VA", "TX", "NY"][i],
  aliases: [],
  revenue: {
    amount_usd: revenue,
    period: "FY2025",
    as_of: "2025-12-31",
    estimate: !isPublic,
    source: src(`${id}-revenue`, "2026-02-01", `${name} reported annual revenue for fiscal 2025.`),
  },
  description: `Made-up ${sector.replace("_", " ")} company used as Phase 0 sample data.`,
  explain: `${name} is not a real company. It exists so the site can be designed before the real data is collected.`,
}));

type D = [string, string, string, Deal["type"], number | null, Deal["amount_kind"], string, Deal["status"], string];
const deals: D[] = [
  ["summit-nimbus-series-c", "summit-capital", "nimbus-labs", "investment", 4e9, "confirmed", "2023-05-10", "completed", "Summit leads $4B round in Nimbus"],
  ["stratus-nimbus-investment", "stratus-cloud", "nimbus-labs", "investment", 10e9, "up_to", "2024-01-15", "in_progress", "Stratus to invest up to $10B in Nimbus"],
  ["nimbus-stratus-cloud", "nimbus-labs", "stratus-cloud", "cloud_contract", 60e9, "up_to", "2025-03-01", "announced", "Nimbus commits up to $60B to Stratus cloud"],
  ["nimbus-gridline-cloud", "nimbus-labs", "gridline-gpu", "cloud_contract", 11e9, "confirmed", "2025-06-20", "in_progress", "Nimbus signs $11B GPU cloud deal with Gridline"],
  ["quark-gridline-stake", "quark-silicon", "gridline-gpu", "investment", 1.2e9, "confirmed", "2023-09-01", "completed", "Quark takes $1.2B stake in Gridline"],
  ["gridline-quark-gpus", "gridline-gpu", "quark-silicon", "chip_order", 7.5e9, "confirmed", "2024-04-12", "in_progress", "Gridline orders $7.5B of Quark GPUs"],
  ["stratus-quark-chips", "stratus-cloud", "quark-silicon", "chip_order", 25e9, "estimated", "2025-01-30", "in_progress", "Stratus buys an estimated $25B of Quark chips"],
  ["quark-forge-wafers", "quark-silicon", "forge-fab", "supply", 18e9, "estimated", "2024-08-01", "in_progress", "Quark books $18B of wafers at Forge Fab"],
  ["quark-recall-hbm", "quark-silicon", "recall-memory", "supply", 6e9, "estimated", "2025-02-14", "in_progress", "Quark buys $6B of HBM memory from Recall"],
  ["gridline-lattice-network", "gridline-gpu", "lattice-networks", "supply", 900e6, "confirmed", "2025-05-05", "completed", "Gridline buys $900M of Lattice switches"],
  ["stratus-hall-lease", "stratus-cloud", "hall-data-centers", "data_center", 3.2e9, "confirmed", "2024-11-11", "in_progress", "Stratus leases a 300 MW Hall campus for $3.2B"],
  ["hall-meridian-ppa", "hall-data-centers", "meridian-power", "power_deal", 2.1e9, "estimated", "2025-07-07", "announced", "Hall signs 20-year power deal with Meridian"],
  ["stratus-meridian-nuclear", "stratus-cloud", "meridian-power", "power_deal", null, "undisclosed", "2026-02-02", "announced", "Stratus buys nuclear power from Meridian"],
  ["quark-nimbus-investment-v1", "quark-silicon", "nimbus-labs", "investment", 100e9, "up_to", "2025-09-22", "revised", "Quark to invest up to $100B in Nimbus"],
  ["quark-nimbus-investment-v2", "quark-silicon", "nimbus-labs", "investment", 30e9, "confirmed", "2026-02-20", "completed", "Quark invests $30B in Nimbus (revised)"],
];

const outDeals: Deal[] = deals.map(([id, from, to, type, amount, kind, date, status, title]) => ({
  id,
  from,
  to,
  type,
  title,
  amount_usd: amount,
  amount_kind: kind,
  date,
  status,
  ...(id === "quark-nimbus-investment-v1" ? { superseded_by: "quark-nimbus-investment-v2" } : {}),
  ...(id === "quark-nimbus-investment-v2" ? { supersedes: "quark-nimbus-investment-v1" } : {}),
  sources: [src(id, date, `${title}.`)],
  confidence: "high",
  last_checked: today,
  added: today,
  explain: `Sample deal: ${title}. Money flows from ${from} to ${to}. Not real.`,
}));

for (const c of outCompanies) writeJson(path.join(ROOT, "data/sample/companies", `${c.id}.json`), c);
for (const d of outDeals) writeJson(path.join(ROOT, "data/sample/deals", `${d.id}.json`), d);
console.log(`wrote ${outCompanies.length} sample companies and ${outDeals.length} sample deals`);
