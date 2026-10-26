import { z } from "zod";

/**
 * Data schemas for every record in /data. The check-data script and the daily
 * agent both validate against these, so a record that fails here never ships.
 */

export const SECTORS = [
  "ai_lab",
  "cloud",
  "neocloud",
  "chip_designer",
  "chip_factory",
  "memory",
  "networking",
  "dc_builder",
  "power",
  "investor",
] as const;
export const SectorSchema = z.enum(SECTORS);
export type Sector = z.infer<typeof SectorSchema>;

export const DEAL_TYPES = [
  "investment", // equity: investor -> company
  "acquisition", // buyer -> target (or target's owners)
  "chip_order", // buyer -> chip maker
  "cloud_contract", // AI lab / customer -> cloud
  "power_deal", // data center owner -> power company
  "supply", // buyer -> supplier (memory, networking, servers, wafers, equipment)
  "data_center", // tenant/owner -> builder or landlord (lease, build contract)
  "financing", // lender -> borrower (debt, project finance)
  "licensing", // licensee -> licensor
] as const;
export const DealTypeSchema = z.enum(DEAL_TYPES);
export type DealType = z.infer<typeof DealTypeSchema>;

export const AMOUNT_KINDS = ["confirmed", "up_to", "estimated", "undisclosed"] as const;
export const AmountKindSchema = z.enum(AMOUNT_KINDS);
export type AmountKind = z.infer<typeof AmountKindSchema>;

export const DEAL_STATUSES = [
  "announced", // signed / announced, money not (fully) moved yet
  "in_progress", // money is moving (e.g. multi-year contract under way)
  "completed", // closed / fully paid
  "revised", // replaced by a newer version: superseded_by is required
  "canceled",
] as const;
export const DealStatusSchema = z.enum(DEAL_STATUSES);
export type DealStatus = z.infer<typeof DealStatusSchema>;

export const SOURCE_KINDS = ["sec_filing", "press_release", "news", "dataset", "other"] as const;
export const SourceKindSchema = z.enum(SOURCE_KINDS);
/** Only these kinds count as "official" for auto-publishing. */
export const OFFICIAL_SOURCE_KINDS = new Set<string>(["sec_filing", "press_release"]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(s + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "not a real calendar date");

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "ids are lowercase-kebab-case");

const url = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//.test(u), "source links must be http(s)");

export const SourceSchema = z
  .object({
    url,
    publisher: z.string().min(2),
    date: isoDate,
    kind: SourceKindSchema,
    /** The exact sentence from the page that proves the claim. One sentence, never more. */
    quote: z.string().min(20).max(400),
  })
  .strict();
export type Source = z.infer<typeof SourceSchema>;

export const MoneyFactSchema = z
  .object({
    amount_usd: z.number().positive(),
    /** e.g. "FY2026" or "2025" or "TTM Q2 2026" */
    period: z.string().min(2),
    as_of: isoDate,
    estimate: z.boolean(),
    /** Optional range when sources disagree (estimates only). */
    low_usd: z.number().positive().optional(),
    high_usd: z.number().positive().optional(),
    source: SourceSchema,
  })
  .strict();
export type MoneyFact = z.infer<typeof MoneyFactSchema>;

export const CompanySchema = z
  .object({
    id: slug,
    name: z.string().min(2),
    sector: SectorSchema,
    public: z.boolean(),
    /** TradingView-style symbol, e.g. "NASDAQ:NVDA". Required for public companies. */
    ticker: z.string().regex(/^[A-Z]+:[A-Z0-9.]+$/).optional(),
    /** SEC Central Index Key for US filers (10 digits, zero padded). */
    cik: z.string().regex(/^\d{10}$/).optional(),
    country: z.string().length(2), // ISO 3166-1 alpha-2
    hq_state: z.string().length(2).optional(), // US state code
    website: url.optional(),
    /** Company newsroom RSS/Atom feed for the daily agent. */
    newsroom_feed: url.optional(),
    aliases: z.array(z.string()).default([]),
    revenue: MoneyFactSchema.optional(),
    valuation: MoneyFactSchema.optional(),
    /** Remaining performance obligations / contracted backlog (for exposure score). */
    backlog: MoneyFactSchema.optional(),
    description: z.string().min(10).max(200),
    explain: z.string().min(20).max(600),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (c.public && !c.ticker) ctx.addIssue({ code: "custom", message: "public companies need a ticker", path: ["ticker"] });
    if (c.country === "US" && !c.hq_state) ctx.addIssue({ code: "custom", message: "US companies need hq_state", path: ["hq_state"] });
  });
export type Company = z.infer<typeof CompanySchema>;

export const DealSchema = z
  .object({
    id: slug,
    /** Who pays (money leaves here). */
    from: slug,
    /** Who gets paid (money arrives here). */
    to: slug,
    type: DealTypeSchema,
    /** Short headline for the deal card, e.g. "OpenAI to buy $300B of Oracle cloud". */
    title: z.string().min(8).max(140),
    amount_usd: z.number().positive().nullable(),
    amount_kind: AmountKindSchema,
    /** Date the deal was announced or signed. */
    date: isoDate,
    length_years: z.number().positive().max(30).optional(),
    status: DealStatusSchema,
    /** For revised/canceled deals: the deal that replaced this one. */
    superseded_by: slug.optional(),
    /** For a revised version: the older deal it replaces. */
    supersedes: slug.optional(),
    /** Related data centers (for power deals and leases). */
    datacenter_ids: z.array(slug).optional(),
    /** EIA plant codes this power deal buys from. */
    plant_ids: z.array(z.string().regex(/^\d+$/)).optional(),
    sources: z.array(SourceSchema).min(1, "every deal needs at least one source"),
    confidence: z.enum(["high", "medium", "low"]),
    last_checked: isoDate,
    /** Date the record was first added to AI Atlas. */
    added: isoDate,
    explain: z.string().min(20).max(600),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.from === d.to) ctx.addIssue({ code: "custom", message: "from and to must differ", path: ["to"] });
    if (d.amount_usd === null && d.amount_kind !== "undisclosed")
      ctx.addIssue({ code: "custom", message: "null amount must use amount_kind 'undisclosed'", path: ["amount_kind"] });
    if (d.amount_usd !== null && d.amount_kind === "undisclosed")
      ctx.addIssue({ code: "custom", message: "undisclosed deals must have amount_usd null", path: ["amount_usd"] });
    if (d.status === "revised" && !d.superseded_by)
      ctx.addIssue({ code: "custom", message: "revised deals must link to the new version (superseded_by)", path: ["superseded_by"] });
  });
export type Deal = z.infer<typeof DealSchema>;

export const DC_STATUSES = ["operating", "under_construction", "planned"] as const;

export const DataCenterSchema = z
  .object({
    id: slug,
    name: z.string().min(2),
    owner: slug,
    tenants: z.array(slug).default([]),
    location: z
      .object({
        lat: z.number().min(18).max(72),
        lon: z.number().min(-180).max(-60),
        city: z.string().optional(),
        county: z.string().optional(),
      })
      .strict(),
    state: z.string().length(2),
    power_mw_now: z.number().nonnegative(),
    power_mw_planned: z.number().nonnegative(),
    status: z.enum(DC_STATUSES),
    est_chips: z
      .object({ count: z.number().positive(), type: z.string().optional(), estimate: z.literal(true) })
      .strict()
      .optional(),
    est_cost_usd: z.number().positive().optional(),
    /** EIA-930 balancing authority code, e.g. "PJM", "ERCO", "MISO". */
    grid_region: z.string().min(2).max(6),
    power_deal_ids: z.array(slug).default([]),
    timeline: z.array(z.object({ date: isoDate, event: z.string().min(3) }).strict()).default([]),
    /** Epoch AI Frontier Data Centers id, when the record comes from Epoch (CC-BY). */
    epoch_id: z.string().optional(),
    sources: z.array(SourceSchema).min(1),
    last_checked: isoDate,
    explain: z.string().min(20).max(600),
  })
  .strict();
export type DataCenter = z.infer<typeof DataCenterSchema>;

export const FUELS = ["gas", "nuclear", "coal", "solar", "wind", "hydro", "battery", "oil", "geothermal", "other"] as const;
export type Fuel = (typeof FUELS)[number];

/** Imported from EIA-860M; stored compactly in data/generated/powerplants.json. */
export const PowerPlantSchema = z
  .object({
    id: z.string().regex(/^\d+$/), // EIA plant code
    name: z.string(),
    operator: z.string(),
    fuel: z.enum(FUELS),
    mw: z.number().positive(),
    lat: z.number(),
    lon: z.number(),
    state: z.string().length(2),
    ba: z.string().optional(),
  })
  .strict();
export type PowerPlant = z.infer<typeof PowerPlantSchema>;

/** One entry per day the daily agent (or a human) changes the data. */
export const ChangelogSchema = z
  .object({
    date: isoDate,
    entries: z.array(
      z
        .object({
          kind: z.enum(["added", "updated", "revised", "canceled", "rechecked"]),
          record: z.enum(["deal", "company", "datacenter"]),
          id: slug,
          summary: z.string().min(5),
          via: z.enum(["auto", "review", "manual"]),
        })
        .strict(),
    ),
  })
  .strict();
export type Changelog = z.infer<typeof ChangelogSchema>;
