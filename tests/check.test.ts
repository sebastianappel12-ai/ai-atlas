import { describe, expect, it } from "vitest";
import { checkData, type RawRecord } from "../src/lib/check";

const company = (id: string, sector: string): RawRecord => ({
  file: `data/companies/${id}.json`,
  data: {
    id,
    name: `Company ${id.toUpperCase()}`,
    sector,
    public: false,
    country: "US",
    hq_state: "CA",
    aliases: [],
    description: "A test company for unit tests.",
    explain: "This company exists only inside the unit tests.",
  },
});

const source = {
  url: "https://www.sec.gov/Archives/edgar/data/1/000000000000000000/ex99.htm",
  publisher: "SEC",
  date: "2025-01-02",
  kind: "sec_filing",
  quote: "The company agreed to purchase the chips for one billion dollars.",
};

const deal = (over: Record<string, unknown> = {}): RawRecord => {
  const data = {
    id: "a-b-chips-2025",
    from: "a",
    to: "b",
    type: "chip_order",
    title: "A buys chips from B",
    amount_usd: 1e9,
    amount_kind: "confirmed",
    date: "2025-01-02",
    status: "announced",
    sources: [source],
    confidence: "high",
    last_checked: "2025-02-01",
    added: "2025-02-01",
    explain: "A pays B one billion dollars for AI chips.",
    ...over,
  };
  return { file: `data/deals/${data.id}.json`, data };
};

const base = { companies: [company("a", "neocloud"), company("b", "chip_designer")], datacenters: [], today: "2026-10-26" };

describe("check-data", () => {
  it("accepts a well-formed deal", () => {
    const r = checkData({ ...base, deals: [deal()] });
    expect(r.errors).toEqual([]);
    expect(r.deals).toHaveLength(1);
  });

  it("rejects a deal that has no source", () => {
    const r = checkData({ ...base, deals: [deal({ sources: [] })] });
    expect(r.errors.some((e) => /at least one source/.test(e.message))).toBe(true);
  });

  it("rejects a deal with the sources field missing", () => {
    const d = deal();
    delete (d.data as Record<string, unknown>).sources;
    const r = checkData({ ...base, deals: [d] });
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("rejects a broken date", () => {
    const r = checkData({ ...base, deals: [deal({ date: "2025-02-30" })] });
    expect(r.errors.some((e) => /calendar date/.test(e.message))).toBe(true);
  });

  it("rejects a missing field", () => {
    const d = deal();
    delete (d.data as Record<string, unknown>).amount_kind;
    expect(checkData({ ...base, deals: [d] }).errors.length).toBeGreaterThan(0);
  });

  it("rejects a future deal date", () => {
    const r = checkData({ ...base, deals: [deal({ date: "2027-01-01" })] });
    expect(r.errors.some((e) => /future/.test(e.message))).toBe(true);
  });

  it("rejects unknown companies", () => {
    const r = checkData({ ...base, deals: [deal({ to: "nobody" })] });
    expect(r.errors.some((e) => /not a known company/.test(e.message))).toBe(true);
  });

  it("enforces money direction for chip orders", () => {
    // A chip order must point at the chip maker; pointing at the neocloud is backwards.
    const r = checkData({ ...base, deals: [deal({ from: "b", to: "a" })] });
    expect(r.errors.some((e) => /must point at/.test(e.message))).toBe(true);
  });

  it("requires revised deals to link to their new version", () => {
    const r = checkData({ ...base, deals: [deal({ status: "revised" })] });
    expect(r.errors.some((e) => /superseded_by/.test(e.message))).toBe(true);
  });

  it("rejects a deal that was deleted since the previous version", () => {
    const r = checkData({ ...base, deals: [deal()], previousDealIds: new Set(["a-b-chips-2025", "gone-deal"]) });
    expect(r.errors.some((e) => /gone-deal/.test(e.message) && /deleted/.test(e.message))).toBe(true);
  });

  it("requires the file name to match the id", () => {
    const d = deal();
    d.file = "data/deals/wrong-name.json";
    expect(checkData({ ...base, deals: [d] }).errors.some((e) => /file name/.test(e.message))).toBe(true);
  });

  it("rejects null amounts not marked undisclosed", () => {
    const r = checkData({ ...base, deals: [deal({ amount_usd: null })] });
    expect(r.errors.some((e) => /undisclosed/.test(e.message))).toBe(true);
  });
});
