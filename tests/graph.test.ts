import { describe, expect, it } from "vitest";
import { dealsAsOf, exposure, filterDeals, findLoops, lineWidth, moneyIn, neighborhood, sumDeals } from "../src/lib/graph";
import type { Company, Deal } from "../src/lib/schema";

let n = 0;
const deal = (from: string, to: string, over: Partial<Deal> = {}): Deal => ({
  id: `d-${++n}`,
  from,
  to,
  type: "investment",
  title: `${from} pays ${to}`,
  amount_usd: 1e9,
  amount_kind: "confirmed",
  date: "2025-01-01",
  status: "announced",
  sources: [],
  confidence: "high",
  last_checked: "2026-10-26",
  added: "2026-10-26",
  explain: "test deal",
  ...over,
});

const company = (id: string, over: Partial<Company> = {}): Company => ({
  id,
  name: id,
  sector: "neocloud",
  public: true,
  ticker: "NASDAQ:X",
  country: "US",
  hq_state: "NJ",
  aliases: [],
  description: "test company",
  explain: "test company explain",
  ...over,
});

describe("money totals (rule 3)", () => {
  it("keeps confirmed, up-to and estimated in separate buckets", () => {
    const t = sumDeals([
      deal("a", "b", { amount_usd: 2e9 }),
      deal("a", "b", { amount_usd: 100e9, amount_kind: "up_to" }),
      deal("a", "b", { amount_usd: 5e9, amount_kind: "estimated" }),
      deal("a", "b", { amount_usd: null, amount_kind: "undisclosed" }),
    ]);
    expect(t).toEqual({ confirmed: 2e9, up_to: 100e9, estimated: 5e9, undisclosed: 1, count: 4 });
  });

  it("does not count revised or canceled deals", () => {
    const t = sumDeals([deal("a", "b", { status: "revised", superseded_by: "x" }), deal("a", "b", { status: "canceled" }), deal("a", "b")]);
    expect(t.confirmed).toBe(1e9);
    expect(t.count).toBe(1);
  });

  it("answers who pays a company the most", () => {
    const deals = [deal("meta", "nvidia", { amount_usd: 5e9 }), deal("openai", "nvidia", { amount_usd: 9e9 }), deal("nvidia", "openai", { amount_usd: 1e9 })];
    expect(moneyIn("nvidia", deals).confirmed).toBe(14e9);
  });
});

describe("loop finder", () => {
  it("catches Nvidia -> CoreWeave -> Nvidia", () => {
    const deals = [
      deal("nvidia", "coreweave", { type: "investment" }),
      deal("coreweave", "nvidia", { type: "chip_order" }),
      deal("openai", "coreweave", { type: "cloud_contract" }),
    ];
    const loops = findLoops(deals);
    expect(loops).toHaveLength(1);
    expect(loops[0].companies.sort()).toEqual(["coreweave", "nvidia"]);
    expect(loops[0].deals).toHaveLength(2);
  });

  it("finds a three-company loop exactly once", () => {
    const loops = findLoops([deal("a", "b"), deal("b", "c"), deal("c", "a")]);
    expect(loops).toHaveLength(1);
    expect(loops[0].companies).toEqual(["a", "b", "c"]);
  });

  it("ignores loops made only of revised deals", () => {
    expect(findLoops([deal("a", "b", { status: "revised", superseded_by: "z" }), deal("b", "a")])).toHaveLength(0);
  });

  it("returns nothing for a one-way chain", () => {
    expect(findLoops([deal("a", "b"), deal("b", "c")])).toHaveLength(0);
  });
});

describe("time slider", () => {
  const v1 = deal("nvidia", "openai", { id: "v1", amount_usd: 100e9, amount_kind: "up_to", date: "2025-09-22", status: "revised", superseded_by: "v2" });
  const v2 = deal("nvidia", "openai", { id: "v2", amount_usd: 30e9, date: "2026-02-20", supersedes: "v1" });

  it("shows nothing before a deal is announced", () => {
    expect(dealsAsOf([v1, v2], "2025-01-01")).toEqual([]);
  });
  it("shows the original version until it is revised", () => {
    expect(dealsAsOf([v1, v2], "2025-12-31").map((d) => d.id)).toEqual(["v1"]);
  });
  it("shows the revised version afterwards", () => {
    expect(dealsAsOf([v1, v2], "2026-10-26").map((d) => d.id)).toEqual(["v2"]);
  });
});

describe("follow the money", () => {
  const deals = [deal("a", "b"), deal("c", "b"), deal("c", "d"), deal("d", "e")];
  it("lights up companies 1, 2 and 3 steps away", () => {
    const n1 = neighborhood("a", deals, 1);
    expect([...n1.keys()].sort()).toEqual(["a", "b"]);
    const n3 = neighborhood("a", deals, 3);
    expect(n3.get("d")).toBe(3);
    expect(n3.has("e")).toBe(false);
  });
});

describe("filters", () => {
  const deals = [deal("a", "b", { amount_usd: 5e8 }), deal("a", "b", { amount_usd: 5e9, amount_kind: "up_to", type: "cloud_contract" }), deal("a", "b", { amount_usd: null, amount_kind: "undisclosed" })];
  it("filters by minimum size", () => expect(filterDeals(deals, { minAmount: 1e9 })).toHaveLength(1));
  it("filters confirmed vs announced", () => {
    expect(filterDeals(deals, { certainty: "confirmed" })).toHaveLength(1);
    expect(filterDeals(deals, { certainty: "announced" })).toHaveLength(2);
  });
  it("filters by type", () => expect(filterDeals(deals, { types: ["cloud_contract"] })).toHaveLength(1));
});

describe("exposure score", () => {
  it("uses backlog when known", () => {
    const oracle = company("oracle", { backlog: { amount_usd: 450e9, period: "Q1", as_of: "2025-08-31", estimate: false, source: { url: "https://sec.gov/x", publisher: "SEC", date: "2025-09-10", kind: "sec_filing", quote: "Remaining performance obligations were $455 billion." } } });
    const e = exposure(oracle, [deal("openai", "oracle", { type: "cloud_contract", amount_usd: 300e9, amount_kind: "estimated" }), deal("meta", "oracle", { type: "cloud_contract", amount_usd: 20e9 })])!;
    expect(e.customer).toBe("openai");
    expect(e.share).toBeCloseTo(300 / 450);
  });
  it("is not shown without a reported backlog", () => {
    expect(exposure(company("cw"), [deal("openai", "cw", { type: "cloud_contract", amount_usd: 22e9 })])).toBeNull();
  });
});

describe("line width", () => {
  it("is log-scaled so big deals don't hide small ones", () => {
    expect(lineWidth(300e9) / lineWidth(2e9)).toBeLessThan(3);
    expect(lineWidth(300e9)).toBeGreaterThan(lineWidth(2e9));
  });
});
