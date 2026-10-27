/**
 * Import every US power plant over 50 MW from EIA-860M (public domain, monthly).
 *   npx tsx scripts/import-eia-plants.ts            # downloads the newest month
 *   npx tsx scripts/import-eia-plants.ts --local    # reuse data/raw/eia/eia860m.xlsx
 * Writes data/generated/powerplants.json.
 */
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import { ROOT, writeJson } from "../src/lib/data-fs";
import { PowerPlantSchema, type Fuel, type PowerPlant } from "../src/lib/schema";

const UA = "AIAtlasBot/0.1 (+https://github.com/sebastianappel12-ai/ai-atlas)";
const RAW = path.join(ROOT, "data/raw/eia/eia860m.xlsx");
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MIN_MW = 50;

const FUEL_BY_CODE: Record<string, Fuel> = {
  NG: "gas", OG: "gas", BFG: "gas", PG: "gas",
  NUC: "nuclear",
  BIT: "coal", SUB: "coal", LIG: "coal", RC: "coal", ANT: "coal", WC: "coal", SGC: "coal",
  SUN: "solar", WND: "wind", WAT: "hydro", MWH: "battery", GEO: "geothermal",
  DFO: "oil", RFO: "oil", JF: "oil", KER: "oil", WO: "oil", PC: "oil",
};

/** EIA posts placeholder files for future months; the real one is megabytes. */
async function downloadLatest(): Promise<string> {
  const now = new Date();
  for (let back = 0; back < 14; back++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const name = `${MONTHS[d.getUTCMonth()]}_generator${d.getUTCFullYear()}.xlsx`;
    for (const dir of ["xls", "archive/xls"]) {
      const url = `https://www.eia.gov/electricity/data/eia860m/${dir}/${name}`;
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1_000_000) continue;
      fs.mkdirSync(path.dirname(RAW), { recursive: true });
      fs.writeFileSync(RAW, buf);
      return url;
    }
  }
  throw new Error("no EIA-860M file found in the last 14 months");
}

const local = process.argv.includes("--local");
const sourceUrl = local ? "local file" : await downloadLatest();

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(RAW);
const ws = wb.getWorksheet("Operating");
if (!ws) throw new Error("Operating sheet missing");
const title = String(ws.getRow(1).getCell(1).value ?? "");
const header = (ws.getRow(3).values as unknown[]).map((v) => String(v ?? ""));
const col = (name: string) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`column "${name}" missing`);
  return i;
};
const C = {
  entity: col("Entity Name"), plantId: col("Plant ID"), plantName: col("Plant Name"), state: col("Plant State"),
  ba: col("Balancing Authority Code"), mw: col("Nameplate Capacity (MW)"), fuel: col("Energy Source Code"),
  lat: col("Latitude"), lon: col("Longitude"),
};

interface Acc { id: string; name: string; operator: string; state: string; ba: string; lat: number; lon: number; mw: number; byFuel: Map<Fuel, number> }
const plants = new Map<string, Acc>();

ws.eachRow((row, n) => {
  if (n <= 3) return;
  const v = row.values as unknown[];
  const id = String(v[C.plantId] ?? "").trim();
  const mw = Number(v[C.mw]);
  if (!/^\d+$/.test(id) || !Number.isFinite(mw) || mw <= 0) return;
  const fuel = FUEL_BY_CODE[String(v[C.fuel] ?? "").trim()] ?? "other";
  let p = plants.get(id);
  if (!p) {
    p = {
      id,
      name: String(v[C.plantName] ?? "").trim(),
      operator: String(v[C.entity] ?? "").trim(),
      state: String(v[C.state] ?? "").trim(),
      ba: String(v[C.ba] ?? "").trim(),
      lat: Number(v[C.lat]),
      lon: Number(v[C.lon]),
      mw: 0,
      byFuel: new Map(),
    };
    plants.set(id, p);
  }
  p.mw += mw;
  p.byFuel.set(fuel, (p.byFuel.get(fuel) ?? 0) + mw);
});

const out: PowerPlant[] = [];
for (const p of plants.values()) {
  if (p.mw < MIN_MW || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || p.state.length !== 2) continue;
  const fuel = [...p.byFuel.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const rec: PowerPlant = {
    id: p.id, name: p.name, operator: p.operator, fuel, mw: Math.round(p.mw * 10) / 10,
    lat: Math.round(p.lat * 1e4) / 1e4, lon: Math.round(p.lon * 1e4) / 1e4, state: p.state,
    ...(p.ba ? { ba: p.ba } : {}),
  };
  out.push(PowerPlantSchema.parse(rec));
}
out.sort((a, b) => b.mw - a.mw);

writeJson(path.join(ROOT, "data/generated/powerplants.json"), {
  source: "U.S. Energy Information Administration, Form EIA-860M (public domain)",
  source_url: sourceUrl,
  title,
  imported: new Date().toISOString().slice(0, 10),
  min_mw: MIN_MW,
  plants: out,
});
const byFuel = out.reduce<Record<string, number>>((m, p) => ((m[p.fuel] = (m[p.fuel] ?? 0) + 1), m), {});
console.log(`${title}: ${out.length} plants ≥ ${MIN_MW} MW`, byFuel);
