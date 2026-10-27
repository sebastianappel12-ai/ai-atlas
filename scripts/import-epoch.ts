/**
 * Import US sites from Epoch AI's Frontier Data Centers hub (CC-BY: credit Epoch AI).
 *   npx tsx scripts/import-epoch.ts           # download fresh CSVs
 *   npx tsx scripts/import-epoch.ts --local   # reuse data/raw/epoch/*.csv
 * Writes data/datacenters/<id>.json for each mappable US site. Records it doesn't own
 * (no epoch_id) are left alone; records it owns are overwritten except hand-added fields
 * (power_deal_ids).
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, writeJson } from "../src/lib/data-fs";
import { DataCenterSchema, type DataCenter } from "../src/lib/schema";

const UA = "AIAtlasBot/0.1 (+https://github.com/sebastianappel12-ai/ai-atlas)";
const RAW = path.join(ROOT, "data/raw/epoch");
const HUB = "https://epoch.ai/data/data-centers";
const today = new Date().toISOString().slice(0, 10);

// ---------- tiny CSV parser (quoted fields, embedded newlines) ----------
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") row.push(field), (field = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += ch;
  }
  if (field || row.length) row.push(field), rows.push(row);
  const [head, ...body] = rows;
  return body.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

async function getCsv(name: string): Promise<Record<string, string>[]> {
  const file = path.join(RAW, name);
  if (!process.argv.includes("--local")) {
    const res = await fetch(`https://epoch.ai/data/data_centers/${name}`, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    fs.mkdirSync(RAW, { recursive: true });
    fs.writeFileSync(file, await res.text());
  }
  return parseCsv(fs.readFileSync(file, "utf8"));
}

// ---------- mapping Epoch names to AI Atlas company ids ----------
const COMPANY: Record<string, string> = {
  spacexai: "xai", xai: "xai", amazon: "amazon", microsoft: "microsoft", google: "google", "google deepmind": "google",
  meta: "meta", oracle: "oracle", coreweave: "coreweave", softbank: "softbank", nebius: "nebius",
  "cipher mining": "cipher-mining", core42: "g42", g42: "g42", openai: "openai", anthropic: "anthropic",
  cursor: "anysphere", crusoe: "crusoe", qts: "qts", "stack infrastructure": "stack-infrastructure",
  vantage: "vantage-data-centers", terawulf: "terawulf", "applied digital": "applied-digital", lambda: "lambda",
};
function mapCompanies(cell: string, keepSpeculative = false): string[] {
  return cell
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && (keepSpeculative || !/#speculative/.test(s)))
    .map((s) => COMPANY[s.replace(/#\w+/g, "").trim().toLowerCase()])
    .filter((x): x is string => Boolean(x));
}
function ownerFromName(name: string): string | undefined {
  const n = name.toLowerCase();
  for (const [k, v] of Object.entries(COMPANY)) if (n.startsWith(k + " ") || n.startsWith(k + "-")) return v;
}

// ---------- locations ----------
/** Town-level coordinates for sites Epoch lists without a street address. */
const MANUAL_LOCATION: Record<string, { lat: number; lon: number; city: string; state: string }> = {
  "OpenAI Stargate Michigan": { lat: 42.17, lon: -83.78, city: "Saline Township", state: "MI" },
  "OpenAI Stargate Milam": { lat: 30.79, lon: -96.98, city: "Milam County", state: "TX" },
  "OpenAI Stargate New Mexico": { lat: 31.86, lon: -106.68, city: "Doña Ana County", state: "NM" },
  "OpenAI Stargate Wisconsin": { lat: 43.39, lon: -87.88, city: "Port Washington", state: "WI" },
  "Google Mesa": { lat: 33.4, lon: -111.63, city: "Mesa", state: "AZ" },
  "Google Storey County": { lat: 39.55, lon: -119.45, city: "Storey County", state: "NV" },
  "Google Kansas City East": { lat: 39.19, lon: -94.4, city: "Kansas City", state: "MO" },
  "Anthropic Barber Lake": { lat: 32.39, lon: -100.86, city: "Colorado City", state: "TX" },
  "Amazon Madison Mega Site": { lat: 32.57, lon: -90.07, city: "Canton", state: "MS" },
  "AWS New Albany": { lat: 40.14, lon: -82.75, city: "New Albany", state: "OH" },
  "Stream Phoenix": { lat: 33.42, lon: -112.36, city: "Goodyear", state: "AZ" },
  "Amazon Ridgeland": { lat: 32.43, lon: -90.12, city: "Ridgeland", state: "MS" },
  "Meta Cheyenne": { lat: 41.1, lon: -104.84, city: "Cheyenne", state: "WY" },
  "Meta Hyperion": { lat: 32.33, lon: -91.68, city: "Holly Ridge", state: "LA" },
  "Meta Aiken": { lat: 33.74, lon: -81.84, city: "Trenton", state: "SC" },
};
const STATE_RE = /\b(A[KLRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\b/;
const STATE_NAMES: Record<string, string> = { mississippi: "MS", nebraska: "NE", "new jersey": "NJ", texas: "TX", ohio: "OH" };

const GEOCACHE = path.join(RAW, "geocode-cache.json");
const geocache: Record<string, { lat: number; lon: number } | null> = fs.existsSync(GEOCACHE) ? JSON.parse(fs.readFileSync(GEOCACHE, "utf8")) : {};
let lastCall = 0;
/** OpenStreetMap Nominatim, max 1 request/second per its usage policy, cached on disk. */
async function geocode(q: string): Promise<{ lat: number; lon: number } | null> {
  if (q in geocache) return geocache[q];
  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const hits = res.ok ? ((await res.json()) as { lat: string; lon: string }[]) : [];
  const hit = hits[0] ? { lat: Number(hits[0].lat), lon: Number(hits[0].lon) } : null;
  geocache[q] = hit;
  fs.writeFileSync(GEOCACHE, JSON.stringify(geocache, null, 1));
  return hit;
}

function stateOf(address: string): string | undefined {
  const m = address.match(/,\s*([A-Z]{2})\b[^,]*$/) ?? address.match(STATE_RE);
  if (m) return m[1];
  for (const [n, s] of Object.entries(STATE_NAMES)) if (address.toLowerCase().includes(n)) return s;
}

// ---------- grid region: nearest EIA plant's balancing authority ----------
const plants = JSON.parse(fs.readFileSync(path.join(ROOT, "data/generated/powerplants.json"), "utf8")).plants as {
  lat: number; lon: number; ba?: string; mw: number;
}[];
function nearestBa(lat: number, lon: number): string {
  let best = "";
  let bestD = Infinity;
  for (const p of plants) {
    if (!p.ba) continue;
    const d = (p.lat - lat) ** 2 + ((p.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) (bestD = d), (best = p.ba);
  }
  return best || "UNK";
}

/** Cut at a word boundary and add an ellipsis. */
const shorten = (s: string, n: number) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n - 1)).replace(/[,;:]$/, "") + "…");
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const num = (s: string) => (s && Number.isFinite(Number(s)) ? Number(s) : 0);

// ---------- main ----------
const centers = await getCsv("data_centers.csv");
const timelines = await getCsv("data_center_timelines.csv");
const byCenter = new Map<string, Record<string, string>[]>();
for (const t of timelines) {
  const list = byCenter.get(t["Data center"]) ?? [];
  list.push(t);
  byCenter.set(t["Data center"], list);
}

const dcDir = path.join(ROOT, "data/datacenters");
const written: string[] = [];
const skipped: string[] = [];
for (const r of centers.filter((c) => c.Country === "United States")) {
  const name = r.Name.trim();
  const owner = mapCompanies(r.Owner, true)[0] ?? ownerFromName(name);
  if (!owner) {
    skipped.push(`${name} (owner "${r.Owner}" not tracked)`);
    continue;
  }
  const address = r.Address.replace(/\s+/g, " ").trim();
  let loc: { lat: number; lon: number } | null = null;
  let city: string | undefined;
  let state: string | undefined;
  const manual = MANUAL_LOCATION[name];
  if (manual) ({ lat: manual.lat, lon: manual.lon } = manual), (loc = manual), (city = manual.city), (state = manual.state);
  else if (address) {
    state = stateOf(address);
    loc = await geocode(address);
    // Fall back to "town, ST" when the street address doesn't match.
    const parts = address.split(",").map((s) => s.trim());
    const town = parts.length >= 3 ? parts[parts.length - 2] : parts[1];
    city = town?.replace(/\b\d{5}\b/, "").trim() || undefined;
    if (!loc && town && state) loc = await geocode(`${town}, ${state}`);
  }
  if (!loc || !state) {
    skipped.push(`${name} (no location: "${address}")`);
    continue;
  }

  const tl = (byCenter.get(name) ?? []).sort((a, b) => a.Date.localeCompare(b.Date));
  const nowMw = num(r["Current power (MW)"]);
  const plannedMw = Math.max(nowMw, ...tl.map((t) => num(t["Power (MW)"])));
  const started = tl.some((t) => t.Date <= today && t["Construction status"].trim());
  const status: DataCenter["status"] = nowMw > 0 ? "operating" : started ? "under_construction" : "planned";
  const h100 = num(r["Current H100 equivalents"]);
  const plannedH100 = Math.max(h100, ...tl.map((t) => num(t["H100 equivalents"])));
  const cost = Math.max(num(r["Current total capital cost (2025 USD billions)"]), ...tl.map((t) => num(t["Total capital cost (2025 USD billions)"])));
  const tenants = [...new Set(mapCompanies(r.Users))].filter((t) => t !== owner);

  const id = slugify(name);
  const file = path.join(dcDir, `${id}.json`);
  const prev = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as DataCenter) : undefined;
  if (prev && !prev.epoch_id) {
    skipped.push(`${name} (hand-written record ${id} exists)`);
    continue;
  }

  const fmtMw = (mw: number) => `${Math.round(mw).toLocaleString("en-US")} MW`;
  const rec: DataCenter = {
    id,
    name,
    owner,
    tenants,
    location: { lat: Math.round(loc.lat * 1e4) / 1e4, lon: Math.round(loc.lon * 1e4) / 1e4, ...(city ? { city } : {}) },
    state,
    power_mw_now: Math.round(nowMw),
    power_mw_planned: Math.round(plannedMw),
    status,
    ...(plannedH100 > 0 ? { est_chips: { count: Math.round(plannedH100), type: "H100-equivalents", estimate: true as const } } : {}),
    ...(cost > 0 ? { est_cost_usd: Math.round(cost * 1e9) } : {}),
    grid_region: nearestBa(loc.lat, loc.lon),
    power_deal_ids: prev?.power_deal_ids ?? [],
    timeline: tl
      .filter((t) => t["Construction status"].trim())
      .slice(-8)
      .map((t) => ({ date: t.Date, event: shorten(t["Construction status"].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim(), 240) })),
    epoch_id: name,
    sources: [
      {
        url: HUB,
        publisher: "Epoch AI, Frontier Data Centers Hub (CC-BY)",
        date: today,
        kind: "dataset",
        quote: `${name}: current power ${r["Current power (MW)"] || "0"} MW; owner ${r.Owner.replace(/\s*#\w+/g, "") || "unlisted"}.`.slice(0, 400),
      },
    ],
    last_checked: today,
    explain:
      `${name} is ${status === "operating" ? "an operating" : status === "under_construction" ? "an under-construction" : "a planned"} AI data center` +
      ` in ${city ? city + ", " : ""}${state}, owned by ${owner}${tenants.length ? ` and used by ${tenants.join(", ")}` : ""}.` +
      ` Epoch AI estimates it draws ${fmtMw(nowMw)} today${plannedMw > nowMw ? ` and ${fmtMw(plannedMw)} when finished` : ""}.`,
  };
  writeJson(file, DataCenterSchema.parse(rec));
  written.push(id);
}

console.log(`Epoch import: wrote ${written.length} US data centers`);
if (skipped.length) console.log("skipped:\n  " + skipped.join("\n  "));
