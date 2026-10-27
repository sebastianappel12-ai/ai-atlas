import type { Company, Deal } from "./schema";

/** A company as shipped to the browser in public/data/graph.json. */
export type GraphCompany = Company & {
  size: number;
  sizeKind: "revenue" | "valuation" | "invested" | "none";
  r: number;
  x: number;
  y: number;
  rank: number;
  degree: number;
};

export interface GraphData {
  generated: string;
  sample: boolean;
  range: { from: string; to: string };
  companies: GraphCompany[];
  deals: Deal[];
}

let cache: Promise<GraphData> | null = null;
export function loadGraphData(): Promise<GraphData> {
  cache ??= fetch("/data/graph.json").then((r) => {
    if (!r.ok) throw new Error(`graph.json: HTTP ${r.status}`);
    return r.json() as Promise<GraphData>;
  });
  return cache;
}
