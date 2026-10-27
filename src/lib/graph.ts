/**
 * Pure graph logic shared by the build script, the site and the tests:
 * money totals, the time slider, follow-the-money, the loop finder and exposure scores.
 * No React, no DOM.
 */
import type { AmountKind, Company, Deal, DealType, Sector } from "./schema";

export interface Totals {
  confirmed: number;
  up_to: number;
  estimated: number;
  undisclosed: number; // count of deals with no number
  count: number;
}

export const emptyTotals = (): Totals => ({ confirmed: 0, up_to: 0, estimated: 0, undisclosed: 0, count: 0 });

/**
 * Rule 3: never add "up to" amounts to confirmed ones. Each amount kind is summed
 * into its own bucket. Revised and canceled deals are left out (their replacement counts).
 */
export function sumDeals(deals: Deal[]): Totals {
  const t = emptyTotals();
  for (const d of deals) {
    if (d.status === "revised" || d.status === "canceled") continue;
    t.count++;
    if (d.amount_usd === null) t.undisclosed++;
    else t[d.amount_kind as Exclude<AmountKind, "undisclosed">] += d.amount_usd;
  }
  return t;
}

export function moneyIn(companyId: string, deals: Deal[]): Totals {
  return sumDeals(deals.filter((d) => d.to === companyId));
}

export function moneyOut(companyId: string, deals: Deal[]): Totals {
  return sumDeals(deals.filter((d) => d.from === companyId));
}

/** A line is solid only when the money is confirmed; everything else is dashed. */
export const isSolid = (d: Pick<Deal, "amount_kind">) => d.amount_kind === "confirmed";

/**
 * Which deals were "live" on a given date (time slider). A deal appears on its date;
 * a revised deal disappears once its replacement appears, so the slider shows both versions in turn.
 * Canceled deals stay visible until today (with their status) — the history matters.
 */
export function dealsAsOf(deals: Deal[], date: string): Deal[] {
  const byId = new Map(deals.map((d) => [d.id, d]));
  return deals.filter((d) => {
    if (d.date > date) return false;
    if (d.superseded_by) {
      const next = byId.get(d.superseded_by);
      if (next && next.date <= date) return false;
    }
    return true;
  });
}

/** Current view of the data: what the slider shows at "today". */
export function currentDeals(deals: Deal[]): Deal[] {
  return deals.filter((d) => d.status !== "revised");
}

export interface DealFilter {
  types?: DealType[];
  minAmount?: number; // USD; deals without a number pass only when minAmount is 0
  statuses?: Deal["status"][];
  /** "confirmed" = solid lines only, "announced" = dashed only, "all" = both */
  certainty?: "all" | "confirmed" | "announced";
}

export function filterDeals(deals: Deal[], f: DealFilter): Deal[] {
  return deals.filter((d) => {
    if (f.types?.length && !f.types.includes(d.type)) return false;
    if (f.statuses?.length && !f.statuses.includes(d.status)) return false;
    if (f.minAmount && (d.amount_usd === null || d.amount_usd < f.minAmount)) return false;
    if (f.certainty === "confirmed" && !isSolid(d)) return false;
    if (f.certainty === "announced" && isSolid(d)) return false;
    return true;
  });
}

/**
 * Follow the money: every company within `hops` steps of `start`, following deals in
 * either direction. Returns distance per company id (start = 0).
 */
export function neighborhood(start: string, deals: Deal[], hops: number): Map<string, number> {
  const adj = new Map<string, Set<string>>();
  for (const d of deals) {
    if (!adj.has(d.from)) adj.set(d.from, new Set());
    if (!adj.has(d.to)) adj.set(d.to, new Set());
    adj.get(d.from)!.add(d.to);
    adj.get(d.to)!.add(d.from);
  }
  const dist = new Map<string, number>([[start, 0]]);
  let frontier = [start];
  for (let h = 1; h <= hops && frontier.length; h++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of adj.get(id) ?? []) {
        if (!dist.has(n)) dist.set(n, h), next.push(n);
      }
    }
    frontier = next;
  }
  return dist;
}

export interface MoneyLoop {
  /** Company ids in cycle order; money flows companies[i] -> companies[i+1] -> ... -> companies[0]. */
  companies: string[];
  /** One deal per step (the largest one when several connect the same pair). */
  deals: Deal[];
}

/**
 * Loop finder: circular deals where money leaves a company and comes back to it,
 * e.g. Nvidia invests in CoreWeave and CoreWeave buys Nvidia chips.
 * Finds every simple directed cycle up to `maxLen` companies, each reported once
 * (rotated so it starts at its smallest id).
 */
export function findLoops(deals: Deal[], maxLen = 4): MoneyLoop[] {
  const live = deals.filter((d) => d.status !== "revised" && d.status !== "canceled");
  const out = new Map<string, Map<string, Deal>>();
  for (const d of live) {
    if (!out.has(d.from)) out.set(d.from, new Map());
    const prev = out.get(d.from)!.get(d.to);
    if (!prev || (d.amount_usd ?? 0) > (prev.amount_usd ?? 0)) out.get(d.from)!.set(d.to, d);
  }
  const nodes = [...out.keys()].sort();
  const loops: MoneyLoop[] = [];
  for (const start of nodes) {
    // Only extend through nodes greater than start, so each cycle is found exactly once.
    const path = [start];
    const onPath = new Set(path);
    const walk = (node: string) => {
      for (const [next] of out.get(node) ?? []) {
        if (next === start && path.length >= 2) {
          const cycleDeals = path.map((c, i) => out.get(c)!.get(path[(i + 1) % path.length])!);
          loops.push({ companies: [...path], deals: cycleDeals });
        } else if (next > start && !onPath.has(next) && path.length < maxLen) {
          path.push(next);
          onPath.add(next);
          walk(next);
          path.pop();
          onPath.delete(next);
        }
      }
    };
    walk(start);
  }
  const size = (l: MoneyLoop) => l.deals.reduce((s, d) => s + (d.amount_usd ?? 0), 0);
  return loops.sort((a, b) => a.companies.length - b.companies.length || size(b) - size(a));
}

export interface Exposure {
  company: string;
  customer: string;
  /** Customer's contracted money into the company (confirmed + estimated; "up to" shown separately). */
  amount: number;
  upTo: number;
  /** Denominator: the company's reported backlog (remaining performance obligations). */
  base: number;
  share: number; // 0..1
}

const CONTRACT_TYPES: DealType[] = ["cloud_contract", "chip_order", "supply", "data_center", "power_deal", "licensing"];

/**
 * Exposure score: how much of a company's future revenue depends on its single biggest
 * customer, e.g. how much of a cloud company's backlog comes from OpenAI.
 * Only defined for companies that report a backlog: without one there is no honest denominator.
 */
export function exposure(company: Company, deals: Deal[]): Exposure | null {
  const backlog = company.backlog?.amount_usd;
  if (!backlog) return null;
  const inbound = deals.filter(
    (d) => d.to === company.id && CONTRACT_TYPES.includes(d.type) && d.status !== "revised" && d.status !== "canceled" && d.status !== "completed",
  );
  if (!inbound.length) return null;
  const perCustomer = new Map<string, { amount: number; upTo: number }>();
  for (const d of inbound) {
    const e = perCustomer.get(d.from) ?? { amount: 0, upTo: 0 };
    if (d.amount_usd !== null) {
      if (d.amount_kind === "up_to") e.upTo += d.amount_usd;
      else e.amount += d.amount_usd;
    }
    perCustomer.set(d.from, e);
  }
  const [customer, top] = [...perCustomer.entries()].sort((a, b) => b[1].amount - a[1].amount)[0];
  if (top.amount <= 0) return null;
  return { company: company.id, customer, amount: top.amount, upTo: top.upTo, base: backlog, share: Math.min(1, top.amount / backlog) };
}

/** Dot size input: revenue, or latest valuation for private companies. */
export function sizeValue(c: Company): { value: number; kind: "revenue" | "valuation" | "none" } {
  if (c.revenue && (c.public || !c.valuation)) return { value: c.revenue.amount_usd, kind: "revenue" };
  if (c.valuation) return { value: c.valuation.amount_usd, kind: "valuation" };
  if (c.revenue) return { value: c.revenue.amount_usd, kind: "revenue" };
  return { value: 0, kind: "none" };
}

/** Line thickness on a log scale so a $300B contract doesn't hide a $2B one. */
export function lineWidth(amountUsd: number | null): number {
  if (amountUsd === null || amountUsd <= 0) return 0.6;
  const w = 0.6 + 1.15 * Math.log10(Math.max(1, amountUsd / 1e8)); // $100M -> 0.6, $1B -> 1.75, $100B -> 4.05
  return Math.min(6, Math.max(0.6, w));
}

export function sectorOf(companies: Map<string, Company>, id: string): Sector | undefined {
  return companies.get(id)?.sector;
}
