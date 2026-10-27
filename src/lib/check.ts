import {
  CompanySchema,
  DataCenterSchema,
  DealSchema,
  type Company,
  type DataCenter,
  type Deal,
  type Sector,
} from "./schema";

/** A raw record as read from disk, before validation. */
export interface RawRecord {
  file: string;
  data: unknown;
}

export interface CheckIssue {
  file: string;
  message: string;
}

export interface CheckResult {
  errors: CheckIssue[];
  warnings: CheckIssue[];
  companies: Company[];
  deals: Deal[];
  datacenters: DataCenter[];
}

export interface CheckInput {
  companies: RawRecord[];
  deals: RawRecord[];
  datacenters: RawRecord[];
  /** EIA plant codes known to exist (from data/generated/powerplants.json). */
  plantIds?: Set<string>;
  /** Deal ids that existed in a previous version of the data (rule 2: never delete). */
  previousDealIds?: Set<string>;
  /** "Today" for future-date checks; defaults to now. */
  today?: string;
  /**
   * Partial mode (seed research in progress): companies listed here count as
   * known even if their file isn't written yet. Maps id -> sector.
   */
  pendingCompanies?: Map<string, Sector>;
}

/** Which sectors a deal type may pay *into* (rule 1: lines point the way money moves). */
const PAYEE_SECTORS: Partial<Record<Deal["type"], Sector[]>> = {
  power_deal: ["power"],
  cloud_contract: ["cloud", "neocloud"],
  chip_order: ["chip_designer", "chip_factory"],
};

/** A quote that runs from one sentence into the next (e.g. `globally."The financing…`). */
export function spansSentences(q: string): boolean {
  const abbrev = /\b(Inc|Corp|Co|Ltd|U\.S|No|St|Mr|Ms|Dr|approx|vs|Jr|N\.V|S\.A|plc|L\.P|LLC)\.\s/;
  return /[a-z0-9%)][.!?]["\u201d]?\s*["\u201c]?[A-Z][a-z]/.test(q) && !abbrev.test(q);
}

function baseName(file: string): string {
  const f = file.split(/[\\/]/).pop() ?? file;
  return f.replace(/\.json$/, "");
}

function zodMessages(err: { issues: { path: PropertyKey[]; message: string }[] }): string[] {
  return err.issues.map((i) => `${i.path.length ? i.path.map(String).join(".") + ": " : ""}${i.message}`);
}

export function checkData(input: CheckInput): CheckResult {
  const errors: CheckIssue[] = [];
  const warnings: CheckIssue[] = [];
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  const companies: Company[] = [];
  const deals: Deal[] = [];
  const datacenters: DataCenter[] = [];
  const dealFile = new Map<string, string>();

  function parseAll<T extends { id: string }>(
    raws: RawRecord[],
    schema: { safeParse: (d: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } } },
    out: T[],
    kind: string,
  ) {
    const seen = new Map<string, string>();
    for (const r of raws) {
      const res = schema.safeParse(r.data);
      if (!res.success) {
        for (const m of zodMessages(res.error)) errors.push({ file: r.file, message: m });
        continue;
      }
      const rec = res.data;
      if (baseName(r.file) !== rec.id) errors.push({ file: r.file, message: `file name must match id "${rec.id}"` });
      const dup = seen.get(rec.id);
      if (dup) {
        errors.push({ file: r.file, message: `duplicate ${kind} id "${rec.id}" (also in ${dup})` });
        continue;
      }
      seen.set(rec.id, r.file);
      out.push(rec);
    }
    return seen;
  }

  const companyFiles = parseAll(input.companies, CompanySchema, companies, "company");
  const dealFiles = parseAll(input.deals, DealSchema, deals, "deal");
  const dcFiles = parseAll(input.datacenters, DataCenterSchema, datacenters, "data center");
  for (const [id, f] of dealFiles) dealFile.set(id, f);

  const companyById = new Map(companies.map((c) => [c.id, c]));
  const sectorOf = (id: string): Sector | undefined => companyById.get(id)?.sector ?? input.pendingCompanies?.get(id);
  const dealById = new Map(deals.map((d) => [d.id, d]));
  const dcIds = new Set(datacenters.map((d) => d.id));

  // Companies: aliases must not collide with another company's name.
  for (const c of companies) {
    for (const s of [c.revenue, c.valuation, c.backlog]) {
      if (s && s.source.date > today) errors.push({ file: companyFiles.get(c.id)!, message: `source date ${s.source.date} is in the future` });
      if (s && s.low_usd && s.high_usd && s.low_usd > s.high_usd)
        errors.push({ file: companyFiles.get(c.id)!, message: "low_usd is above high_usd" });
    }
  }

  for (const d of deals) {
    const file = dealFile.get(d.id)!;
    const fromSector = sectorOf(d.from);
    const toSector = sectorOf(d.to);
    if (!fromSector) errors.push({ file, message: `from "${d.from}" is not a known company` });
    if (!toSector) errors.push({ file, message: `to "${d.to}" is not a known company` });
    if (d.date > today) errors.push({ file, message: `deal date ${d.date} is in the future` });
    if (d.added > today) errors.push({ file, message: `added date ${d.added} is in the future` });
    if (d.last_checked > today) errors.push({ file, message: `last_checked ${d.last_checked} is in the future` });
    for (const s of d.sources) {
      if (s.date > today) errors.push({ file, message: `source date ${s.date} is in the future` });
      if (spansSentences(s.quote)) errors.push({ file, message: "quote must be one sentence (it runs into a second one)" });
    }
    const allowed = PAYEE_SECTORS[d.type];
    if (allowed && toSector && !allowed.includes(toSector)) {
      errors.push({
        file,
        message: `${d.type} must point at a ${allowed.join("/")} company (money flows payer -> payee); "${d.to}" is ${toSector}`,
      });
    }
    if (d.superseded_by) {
      const next = dealById.get(d.superseded_by);
      if (!next) errors.push({ file, message: `superseded_by "${d.superseded_by}" does not exist` });
      else if (next.date < d.date) errors.push({ file, message: `superseded_by "${next.id}" is older than this deal` });
      if (d.status !== "revised" && d.status !== "canceled")
        errors.push({ file, message: `only revised or canceled deals can have superseded_by` });
    }
    if (d.supersedes && !dealById.has(d.supersedes)) errors.push({ file, message: `supersedes "${d.supersedes}" does not exist` });
    for (const id of d.datacenter_ids ?? []) if (!dcIds.has(id)) errors.push({ file, message: `data center "${id}" does not exist` });
    if (input.plantIds) {
      for (const id of d.plant_ids ?? []) if (!input.plantIds.has(id)) errors.push({ file, message: `EIA plant "${id}" is not in powerplants.json` });
    }
    if (d.amount_usd !== null && d.amount_usd < 1e6) warnings.push({ file, message: `amount $${d.amount_usd} looks too small (amounts are whole US dollars)` });
    if (d.amount_usd !== null && d.amount_usd > 2e12) errors.push({ file, message: `amount $${d.amount_usd} is not plausible` });
  }

  for (const dc of datacenters) {
    const file = dcFiles.get(dc.id)!;
    if (!sectorOf(dc.owner)) errors.push({ file, message: `owner "${dc.owner}" is not a known company` });
    for (const t of dc.tenants) if (!sectorOf(t)) errors.push({ file, message: `tenant "${t}" is not a known company` });
    for (const id of dc.power_deal_ids) {
      const pd = dealById.get(id);
      if (!pd) errors.push({ file, message: `power deal "${id}" does not exist` });
      else if (pd.type !== "power_deal") errors.push({ file, message: `"${id}" is a ${pd.type}, not a power_deal` });
    }
    if (dc.power_mw_planned < dc.power_mw_now) warnings.push({ file, message: "planned MW is below current MW" });
    if (dc.last_checked > today) errors.push({ file, message: `last_checked ${dc.last_checked} is in the future` });
  }

  // Rule 2: never delete a deal.
  if (input.previousDealIds) {
    for (const id of input.previousDealIds) {
      if (!dealById.has(id) && !dealFile.has(id)) {
        errors.push({ file: `data/deals/${id}.json`, message: `deal "${id}" was deleted; mark it revised or canceled instead` });
      }
    }
  }

  return { errors, warnings, companies, deals, datacenters };
}
