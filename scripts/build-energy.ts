/**
 * Bundle everything the Energy Map loads into public/data/: data centers, power plants,
 * power-deal arcs, grid regions with today's mix, state prices and state shapes.
 *   npx tsx scripts/build-energy.ts   (runs in "prebuild")
 */
import fs from "node:fs";
import path from "node:path";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { readJsonDir, ROOT, writeJson } from "../src/lib/data-fs";
import type { Company, DataCenter, Deal, PowerPlant } from "../src/lib/schema";

const read = (p: string) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const exists = (p: string) => fs.existsSync(path.join(ROOT, p));

const companies = readJsonDir(path.join(ROOT, "data/companies")).map((r) => r.data as Company);
const deals = readJsonDir(path.join(ROOT, "data/deals")).map((r) => r.data as Deal);
const dcs = readJsonDir(path.join(ROOT, "data/datacenters")).map((r) => r.data as DataCenter);
const plants: PowerPlant[] = exists("data/generated/powerplants.json") ? read("data/generated/powerplants.json").plants : [];
const plantById = new Map(plants.map((p) => [p.id, p]));
const dcById = new Map(dcs.map((d) => [d.id, d]));

const dist2 = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => (a.lat - b.lat) ** 2 + ((a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180)) ** 2;

/** Power-deal arcs: from the buyer's data center (linked, or its nearest one) to each plant it buys from. */
const arcs: { deal: string; from: string; dc: string; plant: string; source: [number, number]; target: [number, number] }[] = [];
for (const d of deals) {
  if (d.type !== "power_deal" || d.status === "revised" || !d.plant_ids?.length) continue;
  for (const pid of d.plant_ids) {
    const p = plantById.get(pid);
    if (!p) continue;
    const linked = (d.datacenter_ids ?? []).map((id) => dcById.get(id)).filter((x): x is DataCenter => Boolean(x));
    const owned = dcs.filter((x) => x.owner === d.from || x.tenants.includes(d.from));
    const pool = linked.length ? linked : owned;
    if (!pool.length) continue;
    const dc = pool.reduce((best, x) => (dist2(x.location, p) < dist2(best.location, p) ? x : best));
    arcs.push({ deal: d.id, from: d.from, dc: dc.id, plant: pid, source: [dc.location.lon, dc.location.lat], target: [p.lon, p.lat] });
  }
}

// Which deals touch each data center (its own power deals + its owner's power deals).
const powerDeals = deals
  .filter((d) => d.type === "power_deal" || (d.datacenter_ids?.length ?? 0) > 0)
  .map((d) => ({ id: d.id, from: d.from, to: d.to, title: d.title, amount_usd: d.amount_usd, amount_kind: d.amount_kind, date: d.date, status: d.status, type: d.type, plant_ids: d.plant_ids ?? [], datacenter_ids: d.datacenter_ids ?? [], source: d.sources[0] }));

// State shapes from us-atlas (public domain Census boundaries), lightly rounded.
const topo = read("node_modules/us-atlas/states-10m.json") as Topology;
const states = feature(topo, topo.objects.states as GeometryCollection);
const round = (x: unknown): unknown => (Array.isArray(x) ? x.map(round) : typeof x === "number" ? Math.round(x * 1000) / 1000 : x);
const FIPS: Record<string, string> = { "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI", "56": "WY" };
const stateFeatures = states.features
  .filter((f) => FIPS[String(f.id)])
  .map((f) => ({ type: "Feature", properties: { state: FIPS[String(f.id)], name: (f.properties as { name: string }).name }, geometry: { ...f.geometry, coordinates: round((f.geometry as { coordinates: unknown }).coordinates) } }));
writeJson(path.join(ROOT, "public/data/us-states.json"), { type: "FeatureCollection", features: stateFeatures }, { compact: true });

if (exists("data/generated/grid-regions.geojson")) writeJson(path.join(ROOT, "public/data/grid-regions.json"), read("data/generated/grid-regions.geojson"), { compact: true });

writeJson(path.join(ROOT, "public/data/energy.json"), {
  generated: new Date().toISOString(),
  companies: companies.map((c) => ({ id: c.id, name: c.name, sector: c.sector })),
  datacenters: dcs,
  plants: plants.map((p) => [p.id, p.name, p.operator, p.fuel, p.mw, p.lat, p.lon, p.state, p.ba ?? ""]),
  plantsAsOf: exists("data/generated/powerplants.json") ? read("data/generated/powerplants.json").title : "",
  arcs,
  powerDeals,
  grid: exists("data/generated/grid-mix.json") ? read("data/generated/grid-mix.json") : null,
  prices: exists("data/generated/electricity-prices.json") ? read("data/generated/electricity-prices.json") : null,
}, { compact: true });
console.log(`build-energy: ${dcs.length} data centers, ${plants.length} plants, ${arcs.length} arcs, ${powerDeals.length} power deals`);
