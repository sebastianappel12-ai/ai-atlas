import type { AmountKind, DealStatus, DealType } from "./schema";

export function fmtUsd(v: number | null | undefined, opts: { precise?: boolean } = {}): string {
  if (v === null || v === undefined) return "undisclosed";
  const abs = Math.abs(v);
  const p = opts.precise ? 2 : 1;
  const trim = (s: string) => s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  if (abs >= 1e12) return `$${trim((v / 1e12).toFixed(p))}T`;
  if (abs >= 1e9) return `$${trim((v / 1e9).toFixed(abs >= 1e11 ? 0 : p))}B`;
  if (abs >= 1e6) return `$${trim((v / 1e6).toFixed(0))}M`;
  if (abs >= 1e3) return `$${trim((v / 1e3).toFixed(0))}K`;
  return `$${v.toFixed(0)}`;
}

export function fmtMw(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(mw >= 10000 ? 0 : 1).replace(/\.0$/, "")} GW`;
  return `${Math.round(mw).toLocaleString("en-US")} MW`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function fmtMonth(iso: string): string {
  const d = new Date(iso.slice(0, 7) + "-01T00:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", timeZone: "UTC" });
}

export const DEAL_TYPE_LABEL: Record<DealType, string> = {
  investment: "Investment",
  acquisition: "Acquisition",
  chip_order: "Chip order",
  cloud_contract: "Cloud contract",
  power_deal: "Power deal",
  supply: "Supply deal",
  data_center: "Data center lease/build",
  financing: "Financing / loan",
  licensing: "Licensing",
};

export const STATUS_LABEL: Record<DealStatus, string> = {
  announced: "Announced",
  in_progress: "In progress",
  completed: "Completed",
  revised: "Revised",
  canceled: "Canceled",
};

export const AMOUNT_KIND_LABEL: Record<AmountKind, string> = {
  confirmed: "Confirmed",
  up_to: "Up to",
  estimated: "Estimated",
  undisclosed: "Undisclosed",
};

/** "$300B (estimated)" / "up to $100B" / "undisclosed" */
export function fmtDealAmount(amount: number | null, kind: AmountKind): string {
  if (amount === null) return "Amount undisclosed";
  if (kind === "up_to") return `Up to ${fmtUsd(amount)}`;
  if (kind === "estimated") return `~${fmtUsd(amount)} (est.)`;
  return fmtUsd(amount);
}
