"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Graph, ListBullets } from "@phosphor-icons/react";
import { ExplainBox } from "@/components/explain";
import { currentDeals, dealsAsOf, filterDeals, findLoops, neighborhood } from "@/lib/graph";
import { loadGraphData, type GraphData } from "@/lib/graph-data";
import { fmtUsd } from "@/lib/format";
import type { Sector } from "@/lib/schema";
import { SECTOR_INFO } from "@/lib/sectors";
import { parseView, serializeView, type ViewState } from "@/lib/view-state";
import { CompanyPanel } from "./CompanyPanel";
import { FilterPanel, Legend, TimeSlider, ToolBar } from "./Controls";
import { DealHoverCard } from "./DealCard";
import type { GLink } from "./GraphCanvas";
import { matchCompanies, SearchPalette } from "./SearchPalette";
import { GuidedTour } from "./GuidedTour";

const GraphCanvas = dynamic(() => import("./GraphCanvas"), { ssr: false, loading: () => <GraphLoading /> });

function GraphLoading() {
  // Skeleton shaped like the real view: a ring of sector clusters, the toolbar and the legend.
  return (
    <div className="relative h-full w-full" aria-busy="true" aria-label="Loading the money graph">
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <div
            key={i}
            className="skeleton absolute rounded-full"
            style={{ left: `calc(50% + ${Math.cos(a) * 30}vmin - 20px)`, top: `calc(50% + ${Math.sin(a) * 30}vmin - 20px)`, width: 40, height: 40 }}
          />
        );
      })}
    </div>
  );
}

function useSize() {
  const [s, setS] = useState({ w: 1200, h: 800 });
  useEffect(() => {
    const on = () => setS({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return s;
}

export function MoneyAtlas({ dcOwners }: { dcOwners: string[] }) {
  const params = useSearchParams();
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Every view has its own URL: the query string *is* the view state.
  const view = useMemo(() => parseView(new URLSearchParams(params.toString())), [params]);
  const [hover, setHover] = useState<{ link: GLink; x: number; y: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"list" | "graph">("list");
  const [mobileQuery, setMobileQuery] = useState("");
  const { w, h } = useSize();
  const mobile = w < 768;

  useEffect(() => {
    loadGraphData().then(setData, (e) => setError(String(e)));
  }, []);

  // replaceState is synced into useSearchParams by the Next.js router, without a server round trip.
  const set = useCallback((patch: Partial<ViewState>) => {
    const current = parseView(new URLSearchParams(window.location.search));
    window.history.replaceState(null, "", `${window.location.pathname}${serializeView({ ...current, ...patch })}`);
  }, []);

  const companies = useMemo(() => new Map((data?.companies ?? []).map((c) => [c.id, c])), [data]);

  /** Deals as of the time slider, after filters. */
  const deals = useMemo(() => {
    if (!data) return [];
    let ds = view.date ? dealsAsOf(data.deals, view.date) : currentDeals(data.deals);
    ds = filterDeals(ds, { types: view.types, minAmount: view.minAmount, certainty: view.certainty });
    if (view.hideCanceled) ds = ds.filter((d) => d.status !== "canceled");
    return ds.filter((d) => {
      const a = companies.get(d.from);
      const b = companies.get(d.to);
      return a && b && !view.hiddenSectors.includes(a.sector) && !view.hiddenSectors.includes(b.sector);
    });
  }, [data, view, companies]);

  const loops = useMemo(() => findLoops(deals), [deals]);

  const highlight = useMemo(() => {
    if (view.loops) return new Map(loops.flatMap((l) => l.companies.map((c) => [c, 0] as const)));
    if (view.company && companies.has(view.company)) return neighborhood(view.company, deals, view.hops || 1);
    return null;
  }, [view.loops, view.company, view.hops, loops, deals, companies]);

  /** Start zoomed out on the 50 biggest companies; selection, loops and "show all" open up the rest. */
  const visibleCompanies = useMemo(() => {
    if (!data) return [];
    const withDeals = new Set(deals.flatMap((d) => [d.from, d.to]));
    return data.companies.filter((c) => {
      if (view.hiddenSectors.includes(c.sector)) return false;
      if (highlight?.has(c.id)) return true;
      if (view.date && !withDeals.has(c.id)) return false;
      return view.all || c.rank <= 50;
    });
  }, [data, deals, view.all, view.hiddenSectors, view.date, highlight]);
  const visibleIds = useMemo(() => new Set(visibleCompanies.map((c) => c.id)), [visibleCompanies]);
  const visibleDeals = useMemo(() => deals.filter((d) => visibleIds.has(d.from) && visibleIds.has(d.to)), [deals, visibleIds]);

  const sectorCounts = useMemo(() => {
    const m = {} as Record<Sector, number>;
    for (const c of data?.companies ?? []) m[c.sector] = (m[c.sector] ?? 0) + 1;
    return m;
  }, [data]);

  const selected = view.company ? companies.get(view.company) ?? null : null;
  const loopDeals = useMemo(() => (view.loops ? new Set(loops.flatMap((l) => l.deals.map((d) => d.id))) : null), [view.loops, loops]);
  const select = (id: string | null) => set({ company: id, loops: false });
  const filtersActive = view.types.length > 0 || view.minAmount > 0 || view.certainty !== "all" || view.hideCanceled;
  const panelDeals = useMemo(() => {
    if (!data) return [];
    return view.date ? dealsAsOf(data.deals, view.date) : data.deals; // panel lists every version, incl. revised
  }, [data, view.date]);

  if (error) return <div className="p-8 text-bad">Could not load data: {error}</div>;

  const graphH = mobile ? Math.round(h * 0.55) : h - 56;

  return (
    <div className="relative flex-1 overflow-hidden">
      {data?.sample && (
        <div className="absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full border border-warn/40 bg-black/70 px-3 py-1 text-xs text-warn">
          Showing made-up sample data
        </div>
      )}

      {/* desktop */}
      {!mobile && (
        <>
          <div className="absolute inset-0">
            {data ? (
              <GraphCanvas
                companies={visibleCompanies}
                deals={visibleDeals}
                width={selected ? w - 432 : w}
                height={graphH}
                selected={view.company}
                highlight={highlight}
                emphasizeDeals={loopDeals}
                onSelect={select}
                onHoverLink={(l, p) => setHover(l && p ? { link: l, x: p.x, y: p.y } : null)}
                focusKey={`${view.all}|${view.hiddenSectors.join()}|${view.loops}|${data.companies.length}`}
              />
            ) : (
              <GraphLoading />
            )}
          </div>
          {hover && <DealHoverCard deals={hover.link.deals} companies={companies} x={hover.x} y={hover.y} />}

          <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-2">
            <div className="pointer-events-auto flex items-center gap-2">
              <SearchPalette companies={data?.companies ?? []} onPick={select} />
              <ToolBar view={view} set={set} onFilters={() => setFiltersOpen(!filtersOpen)} filtersActive={filtersActive} loopCount={loops.length} />
            </div>
            {filtersOpen && (
              <div className="pointer-events-auto">
                <FilterPanel view={view} set={set} onClose={() => setFiltersOpen(false)} />
              </div>
            )}
            {view.loops && (
              <div className="pointer-events-auto panel max-h-[50vh] w-80 overflow-y-auto rounded-xl p-3 text-sm">
                <div className="mb-2 text-xs font-medium tracking-wider text-muted">{loops.length} circular deals</div>
                <ExplainBox>
                  A loop is money that comes back to where it started. For example, a chip maker invests in a cloud company, which then spends money on that chip maker&apos;s chips. Loops can make demand look stronger than it is.
                </ExplainBox>
                <ul className="mt-2 space-y-2">
                  {loops.slice(0, 30).map((l) => (
                    <li key={l.deals.map((d) => d.id).join()} className="rounded-lg border border-line p-2">
                      <div className="flex flex-wrap items-center gap-1 text-xs">
                        {[...l.companies, l.companies[0]].map((id, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && <span className="text-dim">→</span>}
                            <button style={{ color: SECTOR_INFO[companies.get(id)!.sector].color }} onClick={() => select(id)}>
                              {companies.get(id)!.name.replace(/ \(.+\)$/, "")}
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="num mt-1 text-xs text-dim">{l.deals.map((d) => (d.amount_usd ? fmtUsd(d.amount_usd) : "undisclosed")).join(" · ")}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-4 z-10 w-64">
            <Legend view={view} set={set} counts={sectorCounts} />
          </div>
          <div className={`absolute bottom-4 z-10 ${selected ? "left-72 right-[27rem]" : "left-72 right-4"}`}>
            {data && <TimeSlider view={view} set={set} range={data.range} />}
          </div>
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-4 right-4 top-4 z-20 w-[25rem]"
            >
              <CompanyPanel company={selected} deals={panelDeals} companies={companies} onSelect={select} onClose={() => select(null)} hasDataCenters={dcOwners.includes(selected.id)} />
            </motion.div>
          )}
          {data && <GuidedTour />}
        </>
      )}

      {/* phones: a searchable company list plus a smaller graph */}
      {mobile && (
        <div className="flex h-full flex-col">
          <div className="flex gap-1 border-b border-line p-2">
            <button onClick={() => setMobileTab("list")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm ${mobileTab === "list" ? "bg-white/10" : "text-muted"}`}>
              <ListBullets size={15} /> Companies
            </button>
            <button onClick={() => setMobileTab("graph")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm ${mobileTab === "graph" ? "bg-white/10" : "text-muted"}`}>
              <Graph size={15} /> Graph
            </button>
          </div>
          {mobileTab === "list" ? (
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 z-10 bg-bg p-3">
                <input
                  value={mobileQuery}
                  onChange={(e) => setMobileQuery(e.target.value)}
                  placeholder="Search companies"
                  className="w-full rounded-lg border border-line bg-elev px-3 py-2 text-base outline-none focus:border-line-strong"
                  aria-label="Search companies"
                />
              </div>
              <ul className="px-3 pb-6">
                {(mobileQuery ? matchCompanies(data?.companies ?? [], mobileQuery) : [...(data?.companies ?? [])].sort((a, b) => a.rank - b.rank)).map((c) => (
                  <li key={c.id}>
                    <button onClick={() => select(c.id)} className="flex w-full items-center gap-3 border-b border-line py-3 text-left">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SECTOR_INFO[c.sector].color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{c.name}</span>
                        <span className="block text-xs text-dim">{SECTOR_INFO[c.sector].label}</span>
                      </span>
                      <span className="num text-xs text-muted">{c.degree} deals</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="px-3 pb-8 text-xs text-dim">
                Not investment advice. Every deal links to its source. <a href="/methodology" className="underline">Methodology</a>
              </p>
            </div>
          ) : (
            <div className="relative">
              {data && (
                <GraphCanvas
                  companies={visibleCompanies.filter((c) => c.rank <= 30 || highlight?.has(c.id))}
                  deals={visibleDeals}
                  width={w}
                  height={graphH}
                  selected={view.company}
                  highlight={highlight}
                  emphasizeDeals={loopDeals}
                  onSelect={select}
                  onHoverLink={() => {}}
                  focusKey={`m|${data.companies.length}`}
                  compact
                />
              )}
              <div className="px-3">{data && <TimeSlider view={view} set={set} range={data.range} />}</div>
            </div>
          )}
          {selected && (
            <div className="fixed inset-0 z-40 bg-bg">
              <CompanyPanel company={selected} deals={panelDeals} companies={companies} onSelect={select} onClose={() => select(null)} hasDataCenters={dcOwners.includes(selected.id)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
