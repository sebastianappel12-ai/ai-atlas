import { describe, expect, it } from "vitest";
import { DEFAULT_VIEW, parseView, serializeView } from "../src/lib/view-state";

describe("share links", () => {
  it("round-trips a full view through the URL", () => {
    const v = { ...DEFAULT_VIEW, company: "nvidia", hops: 2 as const, types: ["chip_order" as const], minAmount: 1e9, certainty: "confirmed" as const, date: "2024-06-30", loops: true, all: true, hiddenSectors: ["power" as const], hideCanceled: true };
    expect(parseView(new URLSearchParams(serializeView(v)))).toEqual(v);
  });
  it("gives an empty query for the default view", () => {
    expect(serializeView(DEFAULT_VIEW)).toBe("");
  });
  it("ignores junk", () => {
    expect(parseView(new URLSearchParams("c=<script>&h=9&types=bogus&t=yesterday"))).toEqual(DEFAULT_VIEW);
  });
});
