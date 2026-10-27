/**
 * Grid regions colored by today's fuel mix, from EIA-930 hourly data (public domain).
 * Uses the free EIA API when EIA_API_KEY is set; otherwise the keyless six-month bulk file,
 * which EIA refreshes daily. Run daily by GitHub Actions.
 *   npx tsx scripts/import-eia-grid.ts [--local]
 * Writes data/generated/grid-mix.json and (once) data/generated/grid-regions.geojson.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, writeJson } from "../src/lib/data-fs";

const UA = "AIAtlasBot/0.1 (+https://github.com/sebastianappel12-ai/ai-atlas)";
const RAW = path.join(ROOT, "data/raw/eia");
export const MIX_FUELS = ["coal", "gas", "nuclear", "oil", "hydro", "solar", "wind", "battery", "geothermal", "other"] as const;
type MixFuel = (typeof MIX_FUELS)[number];

// ---------- region shapes (HIFLD Control Areas, mapped to EIA-930 codes) ----------
/** HIFLD control-area utility ID -> EIA-930 balancing authority code. */
const HIFLD_TO_BA: Record<string, string> = {
  "56669": "MISO", "59504": "SWPP", "28503": "WACM", "1738": "BPAT", "25471": "WALC", "14379": "PACE", "14725": "PJM",
  "5723": "ERCO", "12825": "NWMT", "13407": "NEVP", "2775": "CISO", "18195": "SOCO", "14378": "PACW", "9191": "IPCO",
  "15473": "PNM", "924": "AECI", "18642": "TVA", "13434": "ISNE", "5701": "EPE", "19610": "WAUW", "13501": "NYIS",
  "20169": "AVA", "803": "AZPS", "15466": "PSCO", "3046": "CPLE", "5416": "DUK", "6455": "FPC", "189": "AEC", "6452": "FPL",
  "21554": "SEC", "17543": "SC", "17539": "SCEG", "15500": "PSEI", "16572": "SRP", "18429": "TPWR", "24211": "TEPC",
  "9216": "IID", "5326": "DOPD", "11249": "LGEE", "14610": "FMPP", "58786": "CPLW", "16534": "BANC", "15248": "PGE",
  "56365": "GWA", "9617": "JEA", "3413": "CHPD", "14624": "GCPD", "11208": "LDWP", "8795": "HST", "55372": "HGMA",
  "18454": "TEC", "14412": "GRMA", "58791": "WWA", "29304": "SEPA", "13485": "NSB", "6909": "GVL", "19281": "TIDC",
  "17716": "SPA", "5748": "EEI", "58790": "GRID", "14015": "OVEC", "56090": "GRIF", "317": "YAD", "16868": "SCL",
  "18445": "TAL", "56812": "DEAA",
};

async function ensureRegions() {
  const out = path.join(ROOT, "data/generated/grid-regions.geojson");
  if (fs.existsSync(out)) return;
  const raw = path.join(RAW, "control-areas.geojson");
  if (!fs.existsSync(raw)) {
    const url =
      "https://services5.arcgis.com/HDRa0B57OVrv2E1q/ArcGIS/rest/services/Control_Areas/FeatureServer/0/query?where=1%3D1&outFields=ID,NAME&f=geojson&maxAllowableOffset=0.03&geometryPrecision=3&outSR=4326";
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`control areas: HTTP ${res.status}`);
    fs.mkdirSync(RAW, { recursive: true });
    fs.writeFileSync(raw, await res.text());
  }
  const gj = JSON.parse(fs.readFileSync(raw, "utf8")) as { features: { properties: { ID: string; NAME: string }; geometry: unknown }[] };
  const features = gj.features
    .filter((f) => HIFLD_TO_BA[f.properties.ID] && f.geometry)
    .map((f) => ({ type: "Feature", properties: { ba: HIFLD_TO_BA[f.properties.ID], name: titleCase(f.properties.NAME) }, geometry: f.geometry }));
  writeJson(out, {
    type: "FeatureCollection",
    attribution: "Control Areas, Homeland Infrastructure Foundation-Level Data (HIFLD); boundaries are approximate and can overlap.",
    features,
  });
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Llc|Inc|Pud|Iso|Ugp|Assn)\b/g, (m) => m.toUpperCase()).replace(/,?\s*\.+$/, "");

// ---------- hourly fuel mix ----------
const COLUMN_FUEL: [RegExp, MixFuel][] = [
  [/from Coal$/, "coal"], [/from Natural Gas$/, "gas"], [/from Nuclear$/, "nuclear"], [/from All Petroleum Products$/, "oil"],
  [/from Hydropower Excluding Pumped Storage$/, "hydro"], [/from Pumped Storage$/, "hydro"],
  [/from Solar (with|without) Integrated Battery Storage$/, "solar"], [/from Wind (with|without) Integrated Battery Storage$/, "wind"],
  [/from Battery Storage$/, "battery"], [/from (Other|Unknown) Energy Storage$/, "battery"], [/from Geothermal$/, "geothermal"],
  [/from (Other|Unknown) Fuel Sources$/, "other"],
];

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') (cur += '"'), i++;
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") out.push(cur), (cur = "");
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function bulkFile(): Promise<string> {
  const now = new Date();
  const half = now.getUTCMonth() < 6 ? "Jan_Jun" : "Jul_Dec";
  const name = `EIA930_BALANCE_${now.getUTCFullYear()}_${half}.csv`;
  const file = path.join(RAW, name);
  if (!process.argv.includes("--local") || !fs.existsSync(file)) {
    const res = await fetch(`https://www.eia.gov/electricity/gridmonitor/sixMonthFiles/${name}`, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    fs.mkdirSync(RAW, { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

interface Hour { utc: number; demand: number | null; gen: Partial<Record<MixFuel, number>> }

function parseBulk(file: string): Map<string, Hour[]> {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const head = splitCsvLine(lines[0]);
  const iBa = head.indexOf("Balancing Authority");
  const iUtc = head.indexOf("UTC Time at End of Hour");
  const iDemand = head.indexOf("Demand (MW)");
  const fuelCols: [number, MixFuel][] = [];
  head.forEach((h, i) => {
    for (const [re, f] of COLUMN_FUEL) if (re.test(h)) fuelCols.push([i, f]);
  });
  const byBa = new Map<string, Hour[]>();
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const c = splitCsvLine(line);
    const utc = Date.parse(c[iUtc] + " UTC");
    if (!Number.isFinite(utc)) continue;
    const gen: Partial<Record<MixFuel, number>> = {};
    let any = false;
    for (const [i, f] of fuelCols) {
      const v = Number(c[i]);
      if (c[i] !== "" && Number.isFinite(v)) (gen[f] = (gen[f] ?? 0) + v), (any = true);
    }
    if (!any) continue;
    const d = Number(c[iDemand]);
    const list = byBa.get(c[iBa]) ?? [];
    list.push({ utc, demand: c[iDemand] !== "" && Number.isFinite(d) ? d : null, gen });
    byBa.set(c[iBa], list);
  }
  return byBa;
}

async function viaApi(key: string): Promise<Map<string, Hour[]>> {
  const start = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 13);
  const byBa = new Map<string, Hour[]>();
  const API_FUEL: Record<string, MixFuel> = { COL: "coal", NG: "gas", NUC: "nuclear", OIL: "oil", WAT: "hydro", SUN: "solar", WND: "wind", BAT: "battery", GEO: "geothermal", OTH: "other", PS: "hydro", SNB: "solar", UES: "battery", UNK: "other", OES: "battery", WNB: "wind" };
  for (let offset = 0; ; offset += 5000) {
    const url = `https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/?api_key=${key}&frequency=hourly&data[0]=value&start=${start}&offset=${offset}&length=5000`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`EIA API: HTTP ${res.status}`);
    const rows = ((await res.json()) as { response: { data: { period: string; respondent: string; fueltype: string; value: string | number }[] } }).response.data;
    for (const r of rows) {
      const utc = Date.parse(r.period + ":00Z");
      const list = byBa.get(r.respondent) ?? [];
      let h = list.find((x) => x.utc === utc);
      if (!h) (h = { utc, demand: null, gen: {} }), list.push(h), byBa.set(r.respondent, list);
      const f = API_FUEL[r.fueltype] ?? "other";
      h.gen[f] = (h.gen[f] ?? 0) + Number(r.value);
    }
    if (rows.length < 5000) break;
  }
  return byBa;
}

await ensureRegions();
const key = process.env.EIA_API_KEY;
const byBa = key ? await viaApi(key) : parseBulk(await bulkFile());

const regions: Record<string, { mix: Record<MixFuel, number>; dominant: MixFuel; clean: number; demand_mw: number | null; hours: number; through: string }> = {};
for (const [ba, hours] of byBa) {
  hours.sort((a, b) => a.utc - b.utc);
  const last = hours[hours.length - 1].utc;
  const day = hours.filter((h) => h.utc > last - 24 * 3600e3);
  const sum = Object.fromEntries(MIX_FUELS.map((f) => [f, 0])) as Record<MixFuel, number>;
  for (const h of day) for (const f of MIX_FUELS) sum[f] += Math.max(0, h.gen[f] ?? 0);
  const total = MIX_FUELS.reduce((s, f) => s + sum[f], 0);
  if (total <= 0) continue;
  const mix = Object.fromEntries(MIX_FUELS.map((f) => [f, Math.round((sum[f] / total) * 1000) / 1000])) as Record<MixFuel, number>;
  const dominant = MIX_FUELS.reduce((a, b) => (mix[b] > mix[a] ? b : a));
  const clean = Math.round((mix.nuclear + mix.hydro + mix.solar + mix.wind + mix.geothermal) * 1000) / 1000;
  const lastDemand = [...day].reverse().find((h) => h.demand !== null)?.demand ?? null;
  regions[ba] = { mix, dominant, clean, demand_mw: lastDemand, hours: day.length, through: new Date(last).toISOString() };
}

writeJson(path.join(ROOT, "data/generated/grid-mix.json"), {
  source: "U.S. Energy Information Administration, Hourly Electric Grid Monitor (EIA-930), public domain",
  via: key ? "EIA API v2" : "EIA-930 six-month bulk file",
  updated: new Date().toISOString(),
  window: "last 24 hours of reported data",
  regions,
});
console.log(`grid mix: ${Object.keys(regions).length} regions, data through ${Object.values(regions).map((r) => r.through).sort().at(-1)}`);
