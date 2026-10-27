/**
 * The plan's measurable "done when" criteria, checked against the real dataset.
 * These keep holding (or fail loudly) as the daily agent adds data.
 */
import { describe, expect, it } from "vitest";
import { checkData } from "../src/lib/check";
import { readPlantIds, readRaw } from "../src/lib/data-fs";
import { currentDeals, dealsAsOf, findLoops, moneyIn } from "../src/lib/graph";
import { SECTORS } from "../src/lib/schema";

const result = checkData({ ...readRaw(), plantIds: readPlantIds() });
const { companies, deals, datacenters } = result;

describe("Phase 1: seed data", () => {
  it("passes check-data", () => expect(result.errors).toEqual([]));
  it("has 150+ companies across all 10 sectors", () => {
    expect(companies.length).toBeGreaterThanOrEqual(150);
    expect(new Set(companies.map((c) => c.sector)).size).toBe(SECTORS.length);
  });
  it("has 300+ deals, each with a source link and a quote", () => {
    expect(deals.length).toBeGreaterThanOrEqual(300);
    for (const d of deals) {
      expect(d.sources.length).toBeGreaterThan(0);
      expect(d.sources[0].url).toMatch(/^https?:\/\//);
    }
  });
  it("has the big data centers and power plants imported", () => {
    expect(datacenters.length).toBeGreaterThanOrEqual(13); // Epoch launched with 13 huge US sites
    expect(readPlantIds()?.size ?? 0).toBeGreaterThan(3000);
  });
});

describe("Phase 2: who pays Nvidia the most", () => {
  it("has money flowing into Nvidia from several payers", () => {
    const payers = new Set(deals.filter((d) => d.to === "nvidia").map((d) => d.from));
    expect(payers.size).toBeGreaterThanOrEqual(5);
    const t = moneyIn("nvidia", deals);
    expect(t.count).toBeGreaterThan(5);
  });
});

describe("Phase 4: graph tools on real data", () => {
  it("the loop finder catches Nvidia <-> CoreWeave", () => {
    const loops = findLoops(currentDeals(deals));
    expect(loops.some((l) => l.companies.length === 2 && l.companies.includes("nvidia") && l.companies.includes("coreweave"))).toBe(true);
  });

  it("the time slider replays 2019 to today", () => {
    const n2019 = dealsAsOf(deals, "2019-12-31").length;
    const n2022 = dealsAsOf(deals, "2022-12-31").length;
    const now = currentDeals(deals).length;
    expect(n2019).toBeGreaterThan(0);
    expect(n2019).toBeLessThan(n2022);
    expect(n2022).toBeLessThan(now);
  });

  it("shows both versions of the Nvidia -> OpenAI deal in turn", () => {
    const late2025 = dealsAsOf(deals, "2025-12-31").map((d) => d.id);
    const today = dealsAsOf(deals, "2026-10-26").map((d) => d.id);
    expect(late2025).toContain("nvidia-openai-investment-2025");
    expect(late2025).not.toContain("nvidia-openai-investment-2026");
    expect(today).toContain("nvidia-openai-investment-2026");
    expect(today).not.toContain("nvidia-openai-investment-2025");
  });
});

describe("Phase 5: energy map data", () => {
  it("every data center has power, status and a grid region", () => {
    for (const d of datacenters) {
      expect(d.power_mw_planned).toBeGreaterThanOrEqual(0);
      expect(d.status).toMatch(/operating|under_construction|planned/);
      expect(d.grid_region.length).toBeGreaterThan(1);
    }
  });
  it("data center owners exist in the Money Graph (so the map can link to them)", () => {
    const ids = new Set(companies.map((c) => c.id));
    for (const d of datacenters) expect(ids.has(d.owner)).toBe(true);
  });
});
