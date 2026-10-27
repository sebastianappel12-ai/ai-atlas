import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { GraphCompany, GraphData } from "./graph-data";
import type { Changelog, DataCenter } from "./schema";

/** Build-time readers for server components. Everything here is static per deploy. */
const root = process.cwd();

export function readGraph(): GraphData {
  return JSON.parse(fs.readFileSync(path.join(root, "public/data/graph.json"), "utf8"));
}

export function readDataCenters(): DataCenter[] {
  const dir = path.join(root, "data/datacenters");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as DataCenter);
}

export function dataCenterOwners(): string[] {
  return [...new Set(readDataCenters().flatMap((d) => [d.owner, ...d.tenants]))];
}

export function readChangelogs(): Changelog[] {
  const dir = path.join(root, "data/changelog");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Changelog);
}

export function companyById(id: string): GraphCompany | undefined {
  return readGraph().companies.find((c) => c.id === id);
}
