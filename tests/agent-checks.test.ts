import { describe, expect, it } from "vitest";
import { checkAmount, checkDate, checkQuoteOnPage, classifySource, decide, findDuplicate, makeDealId, relevantPassages } from "../src/lib/agent/checks";
import type { Company, Deal } from "../src/lib/schema";

const co = (id: string, over: Partial<Company> = {}): Company => ({
  id, name: id, sector: "neocloud", public: true, ticker: "NASDAQ:X", country: "US", hq_state: "NJ", aliases: [],
  description: "test company", explain: "test company explain", website: `https://www.${id}.com`, ...over,
});
const fact = (amount: number) => ({ amount_usd: amount, period: "FY2025", as_of: "2025-12-31", estimate: false, source: { url: "https://sec.gov/x", publisher: "SEC", date: "2026-01-01", kind: "sec_filing" as const, quote: "Revenue was a large number of dollars." } });
const deal = (over: Partial<Deal> = {}): Deal => ({
  id: "a-b-cloud-2026", from: "a", to: "b", type: "cloud_contract", title: "A pays B", amount_usd: 10e9, amount_kind: "confirmed",
  date: "2026-05-01", status: "announced", sources: [{ url: "https://www.sec.gov/1", publisher: "SEC", date: "2026-05-01", kind: "sec_filing", quote: "A agreed to pay B ten billion dollars." }],
  confidence: "high", last_checked: "2026-05-01", added: "2026-05-01", explain: "A pays B for cloud.", ...over,
});

describe("daily agent checks", () => {
  it("only treats SEC filings and the companies' own sites as official", () => {
    const parties = [co("nvidia"), co("coreweave")];
    expect(classifySource("https://www.sec.gov/Archives/edgar/data/1/2/ex99.htm", parties)).toBe("sec_filing");
    expect(classifySource("https://nvidianews.nvidia.com/news/x", parties)).toBe("press_release");
    expect(classifySource("https://investors.coreweave.com/news/y", parties)).toBe("press_release");
    expect(classifySource("https://www.reuters.com/z", parties)).toBe("news");
    expect(classifySource("https://notnvidia.com/fake", parties)).toBe("news");
  });

  it("rejects a quote that is not on the page", () => {
    expect(checkQuoteOnPage("CoreWeave signed a $6.5 billion contract.", "CoreWeave signed a $65 billion contract.").ok).toBe(false);
    expect(checkQuoteOnPage(undefined, "anything at all here").ok).toBe(false);
    expect(checkQuoteOnPage("CoreWeave signed a $6.5 billion contract.", "CoreWeave signed a $6.5 billion contract.").ok).toBe(true);
  });

  it("finds duplicates by parties, type, date window and amount", () => {
    const existing = [deal()];
    expect(findDuplicate(deal({ date: "2026-05-20", amount_usd: 11e9, sources: [] }), existing)?.id).toBe("a-b-cloud-2026");
    expect(findDuplicate(deal({ date: "2026-09-01", sources: [] }), existing)).toBeUndefined();
    expect(findDuplicate(deal({ amount_usd: 30e9, sources: [] }), existing)).toBeUndefined();
    expect(findDuplicate(deal({ type: "investment", sources: [] }), existing)).toBeUndefined();
  });

  it("flags implausible amounts", () => {
    const a = co("a", { revenue: fact(5e9) });
    const b = co("b", { revenue: fact(2e9) });
    expect(checkAmount(10e9, a, b).ok).toBe(true);
    expect(checkAmount(10e12, a, b).ok).toBe(false);
    expect(checkAmount(500, a, b).ok).toBe(false);
    expect(checkAmount(900e9, a, b).ok).toBe(false);
    expect(checkAmount(10e9, co("x"), co("y")).ok).toBe(false); // nothing to compare against -> review
  });

  it("rejects future dates", () => {
    expect(checkDate("2027-01-01", "2026-10-26").ok).toBe(false);
    expect(checkDate("2026-10-01", "2026-10-26").ok).toBe(true);
  });

  it("publishes only official deals that pass every check", () => {
    const ok = { ok: true };
    expect(decide({ quote: ok, duplicate: undefined, isUpdate: false, amount: ok, date: ok, schema: ok, official: true }).decision).toBe("publish");
    expect(decide({ quote: ok, duplicate: undefined, isUpdate: false, amount: ok, date: ok, schema: ok, official: false }).decision).toBe("review");
    expect(decide({ quote: { ok: false, reason: "x" }, duplicate: undefined, isUpdate: false, amount: ok, date: ok, schema: ok, official: true }).decision).toBe("drop");
    expect(decide({ quote: ok, duplicate: deal(), isUpdate: false, amount: ok, date: ok, schema: ok, official: true }).decision).toBe("drop");
    expect(decide({ quote: ok, duplicate: deal(), isUpdate: true, amount: ok, date: ok, schema: ok, official: true }).decision).toBe("review");
    expect(decide({ quote: ok, duplicate: undefined, isUpdate: false, amount: { ok: false, reason: "big" }, date: ok, schema: ok, official: true }).decision).toBe("review");
  });

  it("makes unique ids", () => {
    const taken = new Set(["openai-oracle-cloud-2025", "openai-oracle-cloud-2025-09"]);
    expect(makeDealId("openai", "oracle", "cloud_contract", "2025-09-10", new Set())).toBe("openai-oracle-cloud-2025");
    expect(makeDealId("openai", "oracle", "cloud_contract", "2025-09-10", taken)).toBe("openai-oracle-cloud-2025-09-2");
  });

  it("keeps deal passages from long documents", () => {
    const filler = "Nothing to see here. ".repeat(3000);
    const doc = `${filler} Nvidia agreed to invest $2 billion in CoreWeave. ${filler}`;
    const out = relevantPassages(doc, ["CoreWeave"], 2000);
    expect(out).toContain("Nvidia agreed to invest $2 billion in CoreWeave.");
    expect(out.length).toBeLessThanOrEqual(2000);
  });
});
