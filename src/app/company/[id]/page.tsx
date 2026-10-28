import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteHeader";
import { DealRow } from "@/components/money/DealCard";
import { ExplainBox, WithTerms } from "@/components/explain";
import { dataCenterOwners, readDataCenters, readGraph } from "@/lib/data-server";
import { exposure, sumDeals, type Totals } from "@/lib/graph";
import { fmtMw, fmtUsd } from "@/lib/format";
import { SECTOR_INFO } from "@/lib/sectors";

export function generateStaticParams() {
  return readGraph().companies.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/company/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = readGraph().companies.find((x) => x.id === id);
  if (!c) return {};
  const deals = readGraph().deals.filter((d) => d.from === id || d.to === id);
  return {
    title: `${c.name}: AI deals, money in and out`,
    description: `${c.description} See all ${deals.length} tracked AI deals involving ${c.name}, each with a source.`,
    alternates: { canonical: `/company/${id}` },
  };
}

function TotalsCard({ label, t }: { label: string; t: Totals }) {
  return (
    <div className="panel rounded-xl p-4">
      <div className="text-xs text-muted">
        {label} · {t.count} deals
      </div>
      <div className="num mt-1 text-2xl">{fmtUsd(t.confirmed)}</div>
      <div className="text-xs text-dim">confirmed</div>
      <div className="num mt-2 space-y-0.5 text-xs text-muted">
        {t.up_to > 0 && <div>+ {fmtUsd(t.up_to)} up to (not counted above)</div>}
        {t.estimated > 0 && <div>+ {fmtUsd(t.estimated)} estimated</div>}
        {t.undisclosed > 0 && <div>+ {t.undisclosed} undisclosed</div>}
      </div>
    </div>
  );
}

export default async function CompanyPage({ params }: PageProps<"/company/[id]">) {
  const { id } = await params;
  const g = readGraph();
  const c = g.companies.find((x) => x.id === id);
  if (!c) notFound();
  const companies = new Map(g.companies.map((x) => [x.id, x]));
  const deals = g.deals.filter((d) => d.from === id || d.to === id).sort((a, b) => b.date.localeCompare(a.date));
  const inbound = deals.filter((d) => d.to === id);
  const outbound = deals.filter((d) => d.from === id);
  const info = SECTOR_INFO[c.sector];
  const exp = exposure(c, g.deals);
  const dcs = readDataCenters().filter((d) => d.owner === id || d.tenants.includes(id));
  const hasDc = dataCenterOwners().includes(id);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: c.name,
    description: c.description,
    ...(c.website ? { url: c.website } : {}),
    ...(c.ticker ? { tickerSymbol: c.ticker } : {}),
  };

  return (
    <>
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <nav className="text-xs text-muted">
          <Link href="/graph" className="hover:text-fg">Money Graph</Link> / <span>{info.label}</span>
        </nav>
        <div className="mt-3 flex items-center gap-3">
          <span className="h-4 w-4 rounded-full" style={{ background: info.color, boxShadow: `0 0 14px ${info.color}` }} />
          <h1 className="hero-heading text-4xl font-semibold">{c.name}</h1>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 text-sm text-muted">
          <span style={{ color: info.color }}>{info.label}</span>
          {c.ticker && <span className="num">{c.ticker}</span>}
          <span>{c.public ? "Public" : "Private"}</span>
          <span>{c.hq_state ? `${c.hq_state}, ` : ""}{c.country}</span>
        </div>
        <p className="mt-5 text-lg leading-relaxed text-fg/90">{c.description}</p>
        <div className="mt-3">
          <ExplainBox>
            <WithTerms text={c.explain} />
          </ExplainBox>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Link href={`/graph?c=${id}`} className="rounded-full bg-white px-4 py-1.5 font-medium text-black">See {c.name} in the Money Graph</Link>
          {hasDc && (
            <Link href={`/energy?owner=${id}`} className="rounded-full border border-line px-4 py-1.5 text-muted hover:text-fg">Data centers on the Energy Map</Link>
          )}
        </div>

        <Reveal className="mt-8 grid gap-3 sm:grid-cols-3">
          {c.revenue && (
            <div className="panel rounded-xl p-4">
              <div className="text-xs text-muted">Revenue {c.revenue.estimate ? "(estimate)" : ""}</div>
              <div className="num mt-1 text-2xl">{fmtUsd(c.revenue.amount_usd)}</div>
              <a className="num text-xs text-dim hover:text-fg" href={c.revenue.source.url}>{c.revenue.period}</a>
            </div>
          )}
          {c.valuation && (
            <div className="panel rounded-xl p-4">
              <div className="text-xs text-muted">{c.valuation.period === "AUM" ? "Assets under management" : "Valuation"} {c.valuation.estimate ? "(estimate)" : ""}</div>
              <div className="num mt-1 text-2xl">{fmtUsd(c.valuation.amount_usd)}</div>
              <a className="num text-xs text-dim hover:text-fg" href={c.valuation.source.url}>{c.valuation.period}</a>
            </div>
          )}
          {c.backlog && (
            <div className="panel rounded-xl p-4">
              <div className="text-xs text-muted">Backlog</div>
              <div className="num mt-1 text-2xl">{fmtUsd(c.backlog.amount_usd)}</div>
              <a className="num text-xs text-dim hover:text-fg" href={c.backlog.source.url}>{c.backlog.period}</a>
            </div>
          )}
        </Reveal>

        <Reveal className="mt-3 grid gap-3 sm:grid-cols-2">
          <TotalsCard label="Money in" t={sumDeals(inbound)} />
          <TotalsCard label="Money out" t={sumDeals(outbound)} />
        </Reveal>

        {exp && (
          <p className="mt-4 text-sm text-muted">
            <strong className="text-fg">Exposure:</strong> {Math.round(exp.share * 100)}% of {c.name}&apos;s {fmtUsd(exp.base)} reported backlog is tied to contracts with{" "}
            {companies.get(exp.customer)?.name}.
          </p>
        )}

        {dcs.length > 0 && (
          <Reveal className="mt-10">
            <h2 className="text-lg font-semibold">Data centers ({dcs.length})</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {dcs.map((d) => (
                <li key={d.id} className="panel rounded-lg p-3 text-sm">
                  <Link href={`/energy?dc=${d.id}`} className="font-medium hover:underline">{d.name}</Link>
                  <div className="num text-xs text-muted">
                    {d.location.city ? `${d.location.city}, ` : ""}{d.state} · {fmtMw(d.power_mw_now)} now · {d.status.replace("_", " ")}
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        <Reveal className="mt-10">
          <h2 className="text-lg font-semibold">All deals ({deals.length})</h2>
          <div className="mt-3 space-y-2">
            {deals.map((d) => (
              <DealRow key={d.id} deal={d} companies={companies} />
            ))}
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
