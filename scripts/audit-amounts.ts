/**
 * Cross-check: is each confirmed / "up to" amount actually stated in one of the deal's quotes?
 * Flags deals where no quoted number matches amount_usd (within 3%, or a currency conversion).
 * A flag isn't necessarily wrong (the number may be in the article but not the quoted sentence),
 * but every flag gets a human look.
 *   npx tsx scripts/audit-amounts.ts
 */
import path from "node:path";
import { readJsonDir, ROOT } from "../src/lib/data-fs";
import type { Deal } from "../src/lib/schema";

const UNIT: Record<string, number> = { trillion: 1e12, tn: 1e12, t: 1e12, billion: 1e9, bn: 1e9, b: 1e9, million: 1e6, mn: 1e6, m: 1e6 };

export function moneyMentions(text: string): { value: number; currency: string }[] {
  const out: { value: number; currency: string }[] = [];
  const re = /(US\$|\$|€|£|¥|₩|NT\$|A\$|EUR|USD)?\s?([0-9]+(?:[.,][0-9]+)*)\s*(trillion|billion|million|bn|mn|tn|[bmt])?\b(?:\s*(?:US )?dollars|\s*euros?)?/gi;
  for (const m of text.matchAll(re)) {
    const [, cur, num, unit] = m;
    if (!cur && !unit) continue;
    const v = Number(num.replace(/,(?=\d{3}\b)/g, "").replace(",", "."));
    if (!Number.isFinite(v)) continue;
    const mult = unit ? UNIT[unit.toLowerCase()] ?? 1 : 1;
    out.push({ value: v * mult, currency: (cur ?? "$").toUpperCase() });
  }
  return out;
}

const deals = readJsonDir(path.join(ROOT, "data/deals")).map((r) => r.data as Deal);
const flagged: string[] = [];
for (const d of deals) {
  if (d.amount_usd === null || (d.amount_kind !== "confirmed" && d.amount_kind !== "up_to")) continue;
  const mentions = d.sources.flatMap((s) => moneyMentions(s.quote));
  const match = mentions.some((m) => {
    const ratio = m.value / d.amount_usd!;
    if (Math.abs(ratio - 1) < 0.03) return true;
    // Non-dollar currencies: accept anything within a plausible FX band.
    return m.currency !== "$" && m.currency !== "US$" && m.currency !== "USD" && ratio > 0.6 && ratio < 1.7;
  });
  if (!match) flagged.push(`${d.id}: ${d.amount_kind} ${d.amount_usd.toExponential(3)} — quoted: ${mentions.map((m) => `${m.currency}${m.value.toExponential(2)}`).join(", ") || "no amount in quotes"}`);
}
console.log(`audit-amounts: ${flagged.length} of ${deals.filter((d) => d.amount_usd !== null && (d.amount_kind === "confirmed" || d.amount_kind === "up_to")).length} confirmed/up-to deals need a look`);
for (const f of flagged) console.log("  " + f);
