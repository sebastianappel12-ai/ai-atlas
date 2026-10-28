/**
 * Work out the Money Graph layout once per build, so the map looks the same on every
 * visit and loads instantly. Writes public/data/graph.json (what the browser loads).
 *   npx tsx scripts/build-graph.ts [--sample]
 * Runs automatically before `next build` (see package.json "prebuild").
 */
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import path from "node:path";
import { checkData } from "../src/lib/check";
import { readRaw, ROOT, writeJson } from "../src/lib/data-fs";
import { sizeValue } from "../src/lib/graph";
import { SECTOR_ORDER } from "../src/lib/sectors";
import type { Company, Deal } from "../src/lib/schema";

const sample = process.argv.includes("--sample");
const raw = readRaw(sample);
let { companies, deals } = checkData({ ...raw });
// The real dataset is used once it exists; until then the site shows the sample data.
let usingSample = sample;
if (!sample && companies.length < 10) {
  ({ companies, deals } = checkData({ ...readRaw(true) }));
  usingSample = true;
}
const ids = new Set(companies.map((c) => c.id));
const dropped = deals.filter((d) => !ids.has(d.from) || !ids.has(d.to));
deals = deals.filter((d) => ids.has(d.from) && ids.has(d.to));
if (dropped.length) console.warn(`build-graph: skipped ${dropped.length} deals with unknown companies`);

/** Dot radius: log-ish so Amazon doesn't swallow the screen. */
export const radiusFor = (v: number) => (v > 0 ? 4 + 3.2 * Math.log10(1 + v / 1e8) : 4);

const dealVolume = new Map<string, number>();
const degree = new Map<string, number>();
for (const d of deals) {
  for (const id of [d.from, d.to]) {
    dealVolume.set(id, (dealVolume.get(id) ?? 0) + (d.amount_usd ?? 0));
    degree.set(id, (degree.get(id) ?? 0) + 1);
  }
}

// Sector anchors on a ring; connected companies pull toward each other on top of that.
const anchor = new Map(
  SECTOR_ORDER.map((s, i) => {
    const a = (i / SECTOR_ORDER.length) * Math.PI * 2 - Math.PI / 2;
    return [s, { x: Math.cos(a) * 720, y: Math.sin(a) * 720 }];
  }),
);

/** Funds are sized by the money they've put into tracked deals, not their total assets. */
const outbound = new Map<string, number>();
for (const d of deals) if (d.status !== "revised") outbound.set(d.from, (outbound.get(d.from) ?? 0) + (d.amount_usd ?? 0));
const nodeSize = (c: Company): { value: number; kind: "revenue" | "valuation" | "invested" | "none" } =>
  c.sector === "investor" ? { value: outbound.get(c.id) ?? 0, kind: "invested" } : sizeValue(c);

interface N extends SimulationNodeDatum { id: string; sector: Company["sector"]; r: number }
const nodes: N[] = companies.map((c, i) => {
  const a = anchor.get(c.sector)!;
  const r = radiusFor(nodeSize(c).value);
  return { id: c.id, sector: c.sector, r, x: a.x + Math.cos(i) * 40, y: a.y + Math.sin(i) * 40 };
});
const links = deals.map((d) => ({ source: d.from, target: d.to }));

const sim = forceSimulation(nodes)
  .force("link", forceLink<N, { source: string; target: string }>(links).id((n) => n.id).distance(200).strength(0.012))
  .force("charge", forceManyBody<N>().strength((n) => -110 - n.r * 18))
  .force("x", forceX<N>((n) => anchor.get(n.sector)!.x).strength(0.16))
  .force("y", forceY<N>((n) => anchor.get(n.sector)!.y).strength(0.16))
  .force("collide", forceCollide<N>((n) => n.r + 26).iterations(4))
  .stop();
for (let i = 0; i < 900; i++) sim.tick();

const pos = new Map(nodes.map((n) => [n.id, n]));
const rankScore = (c: Company) => (c.sector === "investor" ? 0 : sizeValue(c).value) + (dealVolume.get(c.id) ?? 0) * 0.5;
const ranked = [...companies].sort((a, b) => rankScore(b) - rankScore(a));
const rank = new Map(ranked.map((c, i) => [c.id, i + 1]));

const outCompanies = companies.map((c) => {
  const p = pos.get(c.id)!;
  const sv = nodeSize(c);
  return {
    ...c,
    size: sv.value,
    sizeKind: sv.kind,
    r: Math.round(p.r * 10) / 10,
    x: Math.round(p.x! * 10) / 10,
    y: Math.round(p.y! * 10) / 10,
    rank: rank.get(c.id)!,
    degree: degree.get(c.id) ?? 0,
  };
});

const dates = deals.map((d) => d.date).sort();
writeJson(path.join(ROOT, "public/data/graph.json"), {
  generated: new Date().toISOString(),
  sample: usingSample,
  range: { from: dates[0] ?? "2019-01-01", to: new Date().toISOString().slice(0, 10) },
  companies: outCompanies,
  deals: deals.sort((a: Deal, b: Deal) => a.date.localeCompare(b.date)),
}, { compact: true });
console.log(`build-graph: ${outCompanies.length} companies, ${deals.length} deals${usingSample ? " (SAMPLE DATA)" : ""}`);
