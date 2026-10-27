"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { ExplainBox, Term, WithTerms } from "@/components/explain";
import { DEAL_TYPE_LABEL, STATUS_LABEL, fmtDate, fmtDealAmount } from "@/lib/format";
import type { Deal } from "@/lib/schema";
import { SECTOR_INFO } from "@/lib/sectors";
import type { GraphCompany } from "@/lib/graph-data";

export function StatusPill({ status }: { status: Deal["status"] }) {
  const color =
    status === "completed" ? "text-good border-good/30" : status === "canceled" ? "text-bad border-bad/30" : status === "revised" ? "text-warn border-warn/30" : "text-muted border-line-strong";
  return <span className={`num rounded border px-1.5 py-0.5 text-xs tracking-wider ${color}`}>{STATUS_LABEL[status]}</span>;
}

export function DealRow({ deal, companies, onSelect, compact }: { deal: Deal; companies: Map<string, GraphCompany>; onSelect?: (id: string) => void; compact?: boolean }) {
  const from = companies.get(deal.from);
  const to = companies.get(deal.to);
  const src = deal.sources[0];
  return (
    <div className="rounded-lg border border-line bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium leading-snug">{deal.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
            <button className="hover:text-fg" style={{ color: from ? SECTOR_INFO[from.sector].color : undefined }} onClick={() => onSelect?.(deal.from)}>
              {from?.name ?? deal.from}
            </button>
            <span>→</span>
            <button className="hover:text-fg" style={{ color: to ? SECTOR_INFO[to.sector].color : undefined }} onClick={() => onSelect?.(deal.to)}>
              {to?.name ?? deal.to}
            </button>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="num text-sm text-fg">
            {deal.amount_kind === "up_to" ? <Term t="up to">{fmtDealAmount(deal.amount_usd, deal.amount_kind)}</Term> : fmtDealAmount(deal.amount_usd, deal.amount_kind)}
          </div>
          <div className="num mt-0.5 text-xs text-dim">{fmtDate(deal.date)}</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{DEAL_TYPE_LABEL[deal.type]}</span>
        {deal.length_years ? <span className="num">· {deal.length_years} yrs</span> : null}
        <StatusPill status={deal.status} />
        {deal.superseded_by ? <span className="text-warn">replaced by a newer version</span> : null}
        {deal.confidence !== "high" ? <span className="text-dim">· {deal.confidence} confidence</span> : null}
      </div>
      {!compact && (
        <div className="mt-2">
          <ExplainBox>
            <WithTerms text={deal.explain} />
          </ExplainBox>
        </div>
      )}
      {src && (
        <div className="mt-2 space-y-1">
          {(compact ? [src] : deal.sources).map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="group block text-xs text-muted hover:text-fg">
              <span className="text-fg/70 group-hover:text-fg">&ldquo;{s.quote}&rdquo;</span>
              <span className="mt-0.5 flex items-center gap-1 text-dim">
                <ArrowSquareOut size={11} /> {s.publisher} · {fmtDate(s.date)}
              </span>
            </a>
          ))}
        </div>
      )}
      {!compact && (
        <a
          className="mt-2 inline-block text-xs text-dim underline-offset-2 hover:text-fg hover:underline"
          href={`https://github.com/sebastianappel12-ai/ai-atlas/issues/new?template=report-error.yml&title=${encodeURIComponent(`Error in deal: ${deal.id}`)}&deal=${encodeURIComponent(deal.id)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Report an error
        </a>
      )}
    </div>
  );
}

/** Floating card shown when hovering a line. */
export function DealHoverCard({ deals, companies, x, y }: { deals: Deal[]; companies: Map<string, GraphCompany>; x: number; y: number }) {
  const shown = [...deals].sort((a, b) => (b.amount_usd ?? 0) - (a.amount_usd ?? 0)).slice(0, 3);
  return (
    <div className="panel pointer-events-none absolute z-30 w-80 space-y-2 rounded-xl p-2 shadow-2xl" style={{ left: Math.min(x + 16, (typeof window !== "undefined" ? window.innerWidth : 1200) - 340), top: y + 16 }}>
      {shown.map((d) => (
        <DealRow key={d.id} deal={d} companies={companies} compact />
      ))}
      {deals.length > 3 && <div className="px-1 text-xs text-muted">+{deals.length - 3} more. Click either company to see them all.</div>}
    </div>
  );
}
