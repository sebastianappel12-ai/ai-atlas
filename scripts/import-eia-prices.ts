/**
 * Average electricity prices by state (EIA, public domain): yearly history plus the newest month
 * vs. the same month a year earlier. This is the "what does this mean for my power bill" layer.
 *   npx tsx scripts/import-eia-prices.ts [--local]
 * Writes data/generated/electricity-prices.json.
 */
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import { ROOT, writeJson } from "../src/lib/data-fs";

const UA = "AIAtlasBot/0.1 (+https://github.com/sebastianappel12-ai/ai-atlas)";
const RAW = path.join(ROOT, "data/raw/eia");
const FILES = {
  annual: "https://www.eia.gov/electricity/data/state/avgprice_annual.xlsx",
  monthly: "https://www.eia.gov/electricity/monthly/xls/table_5_06_a.xlsx",
};
const STATE_NAMES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE",
  "District of Columbia": "DC", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
  Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

async function load(kind: keyof typeof FILES) {
  const file = path.join(RAW, path.basename(FILES[kind]));
  if (!process.argv.includes("--local") || !fs.existsSync(file)) {
    const res = await fetch(FILES[kind], { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${kind}: HTTP ${res.status}`);
    fs.mkdirSync(RAW, { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  return wb.worksheets[0];
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// Yearly residential and all-sector price, total electric industry.
const annual = await load("annual");
const header = (annual.getRow(2).values as unknown[]).map(String);
const col = (n: string) => header.indexOf(n);
const history: Record<string, { year: number; residential: number | null; total: number | null }[]> = {};
annual.eachRow((row, n) => {
  if (n <= 2) return;
  const v = row.values as unknown[];
  if (v[col("Industry Sector Category")] !== "Total Electric Industry") return;
  const st = String(v[col("State")]);
  if (!/^[A-Z]{2}$/.test(st)) return;
  (history[st] ??= []).push({ year: Number(v[col("Year")]), residential: num(v[col("Residential")]), total: num(v[col("Total")]) });
});
for (const s of Object.values(history)) s.sort((a, b) => a.year - b.year);

// Newest month vs. a year earlier.
const monthly = await load("monthly");
const subtitle = String(monthly.getRow(2).getCell(1).value ?? "");
const month = String(monthly.getRow(4).getCell(2).value ?? "");
const latest: Record<string, { residential: number | null; residential_prev: number | null; total: number | null; total_prev: number | null }> = {};
monthly.eachRow((row, n) => {
  if (n <= 4) return;
  const v = row.values as unknown[];
  const st = STATE_NAMES[String(v[1] ?? "").trim()];
  if (!st) return;
  latest[st] = { residential: num(v[2]), residential_prev: num(v[3]), total: num(v[10]), total_prev: num(v[11]) };
});

writeJson(path.join(ROOT, "data/generated/electricity-prices.json"), {
  source: "U.S. Energy Information Administration: State Electricity Profiles (annual) and Electric Power Monthly Table 5.6.A",
  units: "cents per kilowatt-hour",
  latest_month: month,
  subtitle,
  latest,
  history,
});
const years = Object.values(history).flat().map((r) => r.year);
console.log(`prices: ${Object.keys(latest).length} states for ${month}; history ${Math.min(...years)}–${Math.max(...years)}`);
