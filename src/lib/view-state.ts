import { DEAL_TYPES, SECTORS, type DealType, type Sector } from "./schema";

/** Everything that defines a Money Graph view. Serialized to the URL so views can be shared. */
export interface ViewState {
  company: string | null; // selected company id
  hops: 0 | 1 | 2 | 3; // follow the money (0 = off)
  types: DealType[]; // empty = all
  minAmount: number; // USD
  certainty: "all" | "confirmed" | "announced";
  hideCanceled: boolean;
  date: string | null; // time slider (YYYY-MM-DD); null = today
  loops: boolean;
  all: boolean; // show every company instead of the top 50
  hiddenSectors: Sector[];
}

export const DEFAULT_VIEW: ViewState = {
  company: null,
  hops: 1,
  types: [],
  minAmount: 0,
  certainty: "all",
  hideCanceled: false,
  date: null,
  loops: false,
  all: false,
  hiddenSectors: [],
};

export function parseView(p: URLSearchParams): ViewState {
  const v = { ...DEFAULT_VIEW };
  const c = p.get("c");
  if (c && /^[a-z0-9-]+$/.test(c)) v.company = c;
  const h = Number(p.get("h"));
  if ([0, 1, 2, 3].includes(h) && p.has("h")) v.hops = h as ViewState["hops"];
  v.types = (p.get("types") ?? "").split(",").filter((t): t is DealType => (DEAL_TYPES as readonly string[]).includes(t));
  const min = Number(p.get("min"));
  if (Number.isFinite(min) && min > 0) v.minAmount = min;
  const cert = p.get("cert");
  if (cert === "confirmed" || cert === "announced") v.certainty = cert;
  v.hideCanceled = p.get("nocancel") === "1";
  const t = p.get("t");
  if (t && /^\d{4}-\d{2}(-\d{2})?$/.test(t)) v.date = t.length === 7 ? `${t}-28` : t;
  v.loops = p.get("loops") === "1";
  v.all = p.get("all") === "1";
  v.hiddenSectors = (p.get("hide") ?? "").split(",").filter((s): s is Sector => (SECTORS as readonly string[]).includes(s));
  return v;
}

export function serializeView(v: ViewState): string {
  const p = new URLSearchParams();
  if (v.company) p.set("c", v.company);
  if (v.hops !== DEFAULT_VIEW.hops) p.set("h", String(v.hops));
  if (v.types.length) p.set("types", v.types.join(","));
  if (v.minAmount) p.set("min", String(v.minAmount));
  if (v.certainty !== "all") p.set("cert", v.certainty);
  if (v.hideCanceled) p.set("nocancel", "1");
  if (v.date) p.set("t", v.date);
  if (v.loops) p.set("loops", "1");
  if (v.all) p.set("all", "1");
  if (v.hiddenSectors.length) p.set("hide", v.hiddenSectors.join(","));
  const s = p.toString();
  return s ? `?${s}` : "";
}
