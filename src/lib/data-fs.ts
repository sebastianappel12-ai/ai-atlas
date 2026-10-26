import fs from "node:fs";
import path from "node:path";
import type { RawRecord } from "./check";

/** Repo root: the nearest folder at or above cwd whose package.json is "ai-atlas". */
function findRoot(): string {
  let dir = process.cwd();
  for (;;) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg) && JSON.parse(fs.readFileSync(pkg, "utf8")).name === "ai-atlas") return dir;
    const up = path.dirname(dir);
    if (up === dir) return process.cwd();
    dir = up;
  }
}
export const ROOT = findRoot();

export function dataDir(sample = false): string {
  return path.join(ROOT, "data", sample ? "sample" : "");
}

export function readJsonDir(dir: string): RawRecord[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const file = path.join(dir, f);
      const rel = path.relative(ROOT, file);
      try {
        return { file: rel, data: JSON.parse(fs.readFileSync(file, "utf8")) };
      } catch (e) {
        return { file: rel, data: { __parseError: e instanceof Error ? e.message : String(e) } };
      }
    });
}

export function readRaw(sample = false) {
  const base = dataDir(sample);
  return {
    companies: readJsonDir(path.join(base, "companies")),
    deals: readJsonDir(path.join(base, "deals")),
    datacenters: readJsonDir(path.join(base, "datacenters")),
  };
}

export function readPlantIds(): Set<string> | undefined {
  const f = path.join(ROOT, "data", "generated", "powerplants.json");
  if (!fs.existsSync(f)) return undefined;
  const rows = JSON.parse(fs.readFileSync(f, "utf8")) as { plants: { id: string }[] };
  return new Set(rows.plants.map((p) => p.id));
}

export function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}
