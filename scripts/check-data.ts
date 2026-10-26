/**
 * Validate every record in /data against the schemas and the three data rules.
 *   npm run check-data                 # real data
 *   npm run check-data -- --sample     # Phase 0 sample data
 *   npm run check-data -- --against origin/main   # also fail if a deal was deleted
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Sector } from "../src/lib/schema";
import { checkData } from "../src/lib/check";
import { readPlantIds, readRaw, ROOT } from "../src/lib/data-fs";

const args = process.argv.slice(2);
const sample = args.includes("--sample");
// --partial: treat every id in data/roster.json as a known company (seed research in progress).
const partial = args.includes("--partial");
const againstIdx = args.indexOf("--against");
const against = againstIdx >= 0 ? args[againstIdx + 1] : undefined;

let previousDealIds: Set<string> | undefined;
if (against) {
  try {
    const out = execFileSync("git", ["ls-tree", "--name-only", `${against}:data/deals`], { cwd: ROOT, encoding: "utf8" });
    previousDealIds = new Set(out.split("\n").filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")));
  } catch {
    console.warn(`(could not read data/deals at ${against}; skipping the never-delete check)`);
  }
}

let pendingCompanies: Map<string, Sector> | undefined;
if (partial) {
  const roster = JSON.parse(fs.readFileSync(path.join(ROOT, "data/roster.json"), "utf8")) as Record<string, [string, string][] | string>;
  pendingCompanies = new Map();
  for (const [sector, rows] of Object.entries(roster)) {
    if (Array.isArray(rows)) for (const [id] of rows) pendingCompanies.set(id, sector as Sector);
  }
}

const raw = readRaw(sample);
const result = checkData({ ...raw, plantIds: sample ? undefined : readPlantIds(), previousDealIds, pendingCompanies });

for (const w of result.warnings) console.warn(`warn  ${w.file}: ${w.message}`);
for (const e of result.errors) console.error(`ERROR ${e.file}: ${e.message}`);

const sectors = new Set(result.companies.map((c) => c.sector));
console.log(
  `\ncheck-data${sample ? " (sample)" : ""}: ${result.companies.length} companies in ${sectors.size} sectors, ` +
    `${result.deals.length} deals, ${result.datacenters.length} data centers — ` +
    `${result.errors.length} errors, ${result.warnings.length} warnings`,
);
process.exit(result.errors.length ? 1 : 0);
