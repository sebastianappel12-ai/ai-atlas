"use client";

import { ArrowDownLeft, ArrowSquareOut, ArrowUpRight, MapPin, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExplainBox, Term, WithTerms } from "@/components/explain";
import { TradingViewChart } from "@/components/TradingViewChart";
import { exposure, sumDeals, type Totals } from "@/lib/graph";
import type { GraphCompany } from "@/lib/graph-data";
import { fmtUsd } from "@/lib/format";
import type { Deal, MoneyFact } from "@/lib/schema";
import { SECTOR_INFO } from "@/lib/sectors";
import { DealRow } from "./DealCard";

function Fact({ label, fact, term }: { label: string; fact?: MoneyFact; term?: string }) {
  if (!fact) return null;
  return (
    <div className="rounded-lg border border-line p-2.5">
      <div className="text-xs text-muted">{term ? <Term t={term}>{label}</Term> : label}</div>
      <div className="num mt-0.5 text-base">
        {fact.estimate ? "~" : ""}
        {fmtUsd(fact.amount_usd)}
      </div>
      <a href={fact.source.url} target="_blank" rel="noopener noreferrer" className="num text-xs text-dim hover:text-fg">
        {fact.period}
        {fact.estimate ? " · estimate" : ""}
        {fact.low_usd && fact.high_usd ? ` · range ${fmtUsd(fact.low_usd)}–${fmtUsd(fact.high_usd)}` : ""}
      </a>
    </div>
  );
}

function TotalsBlock({ label, icon, t }: { label: string; icon: React.ReactNode; t: Totals }) {
  return (
    <div className="rounded-lg border border-line p-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label} <span className="num text-dim">· {t.count} deals</span>
      </div>
      <div className="num mt-1 text-base">{fmtUsd(t.confirmed)}</div>
      <div className="text-xs text-dim">
        <Term t="confirmed">confirmed</Term>
      </div>
      {(t.up_to > 0 || t.estimated > 0 || t.undisclosed > 0) && (
        <div className="num mt-1 space-y-0.5 text-xs text-muted">
          {t.up_to > 0 && (
            <div>
              + {fmtUsd(t.up_to)} <Term t="up to">up to</Term>
            </div>
          )}
          {t.estimated > 0 && (
            <div>
              + {fmtUsd(t.estimated)} <Term t="estimated">estimated</Term>
            </div>
          )}
          {t.undisclosed > 0 && <div>+ {t.undisclosed} undisclosed</div>}
        </div>
      )}
    </div>
  );
}

export function CompanyPanel({
  company,
  deals,
  companies,
  onSelect,
  onClose,
  hasDataCenters,
}: {
  company: GraphCompany;
  deals: Deal[];
  companies: Map<string, GraphCompany>;
  onSelect: (id: string) => void;
  onClose: () => void;
  hasDataCenters: boolean;
}) {
  const [tab, setTab] = useState<"in" | "out">("in");
  const info = SECTOR_INFO[company.sector];
  const inbound = useMemo(() => deals.filter((d) => d.to === company.id), [deals, company.id]);
  const outbound = useMemo(() => deals.filter((d) => d.from === company.id), [deals, company.id]);
  const exp = useMemo(() => exposure(company, deals), [company, deals]);

  /** "Who pays X the most?" — payers ranked by confirmed money, then other buckets. */
  const topPayers = useMemo(() => {
    const m = new Map<string, Deal[]>();
    for (const d of inbound) m.set(d.from, [...(m.get(d.from) ?? []), d]);
    return [...m.entries()]
      .map(([id, ds]) => ({ id, t: sumDeals(ds) }))
      .sort((a, b) => b.t.confirmed - a.t.confirmed || b.t.estimated + b.t.up_to - (a.t.estimated + a.t.up_to))
      .slice(0, 5);
  }, [inbound]);

  const list = (tab === "in" ? inbound : outbound).slice().sort((a, b) => b.date.localeCompare(a.date));

  return (
    <aside className="panel flex h-full w-full flex-col overflow-hidden md:rounded-2xl" aria-label={`${company.name} details`}>
      <div className="flex items-start justify-between gap-3 border-b border-line p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: info.color, boxShadow: `0 0 10px ${info.color}` }} />
            <h2 className="truncate text-lg font-semibold">{company.name}</h2>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span style={{ color: info.color }}>{info.label}</span>
            {company.ticker && <span className="num">· {company.ticker}</span>}
            {!company.public && <span>· private</span>}
            <span>· {company.hq_state ? `${company.hq_state}, ` : ""}{company.country}</span>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-white/10 hover:text-fg" aria-label="Close panel">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-sm leading-relaxed text-fg/90">
          <WithTerms text={company.description} />
        </p>
        <ExplainBox>
          <WithTerms text={company.explain} />
        </ExplainBox>

        <div className="flex flex-wrap gap-2 text-xs">
          <Link href={`/company/${company.id}`} className="rounded-full border border-line px-2.5 py-1 text-muted hover:border-line-strong hover:text-fg">
            Company page
          </Link>
          {hasDataCenters && (
            <Link href={`/energy?owner=${company.id}`} className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-muted hover:border-line-strong hover:text-fg">
              <MapPin size={12} /> Data centers on the Energy Map
            </Link>
          )}
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-muted hover:border-line-strong hover:text-fg">
              <ArrowSquareOut size={12} /> Website
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Fact label="Revenue" fact={company.revenue} />
          <Fact label="Valuation" fact={company.valuation} term="valuation" />
          <Fact label="Backlog" fact={company.backlog} term="backlog" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <TotalsBlock label="Money in" icon={<ArrowDownLeft size={12} />} t={sumDeals(inbound)} />
          <TotalsBlock label="Money out" icon={<ArrowUpRight size={12} />} t={sumDeals(outbound)} />
        </div>

        {topPayers.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium tracking-wider text-muted">Who pays {company.name.replace(/ \(.+\)$/, "")} the most</h3>
            <ol className="space-y-1">
              {topPayers.map(({ id, t }, i) => {
                const c = companies.get(id);
                return (
                  <li key={id} className="flex items-center justify-between gap-2 text-sm">
                    <button className="flex min-w-0 items-center gap-2 hover:text-white" onClick={() => onSelect(id)}>
                      <span className="num w-4 text-dim">{i + 1}</span>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c ? SECTOR_INFO[c.sector].color : "#888" }} />
                      <span className="truncate">{c?.name ?? id}</span>
                    </button>
                    <span className="num shrink-0 text-xs text-muted">
                      {t.confirmed > 0 ? fmtUsd(t.confirmed) : t.estimated > 0 ? `~${fmtUsd(t.estimated)} est.` : t.up_to > 0 ? `up to ${fmtUsd(t.up_to)}` : "undisclosed"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {exp && (
          <div className="rounded-lg border border-line p-3">
            <div className="text-xs font-medium tracking-wider text-muted">
              <Term t="exposure">Exposure score</Term>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="num text-2xl">{Math.round(exp.share * 100)}%</span>
              <span className="text-sm text-muted">
                from {companies.get(exp.customer)?.name ?? exp.customer}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.round(exp.share * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-dim">
              {fmtUsd(exp.amount)} of tracked contracts from its biggest customer, against {fmtUsd(exp.base)} of reported{" "}
              <Term t="backlog">backlog</Term> ({company.backlog?.period}).
              {exp.upTo > 0 ? ` Another ${fmtUsd(exp.upTo)} is "up to" and not counted.` : ""}
            </p>
          </div>
        )}

        {company.public && company.ticker && (
          <div>
            <h3 className="mb-2 text-xs font-medium tracking-wider text-muted">Share price</h3>
            <TradingViewChart symbol={company.ticker} />
          </div>
        )}

        <div>
          <div className="mb-2 flex gap-1 rounded-lg bg-white/5 p-1 text-xs">
            {(["in", "out"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-2 py-1.5 ${tab === t ? "bg-white/15 text-fg" : "text-muted hover:text-fg"}`}
              >
                {t === "in" ? `Money in (${inbound.length})` : `Money out (${outbound.length})`}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {list.length === 0 && <p className="text-sm text-dim">No tracked deals in this direction.</p>}
            {list.map((d) => (
              <DealRow key={d.id} deal={d} companies={companies} onSelect={onSelect} />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
