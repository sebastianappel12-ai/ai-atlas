"use client";

import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer, GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Stack, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ExplainBox, Term, WithTerms } from "@/components/explain";
import { fmtDate, fmtDealAmount, fmtMw, fmtUsd } from "@/lib/format";
import type { DataCenter, Fuel } from "@/lib/schema";
import { SECTOR_INFO } from "@/lib/sectors";
import type { Sector } from "@/lib/schema";

type PlantRow = [string, string, string, Fuel, number, number, number, string, string];
type MixFuel = "coal" | "gas" | "nuclear" | "oil" | "hydro" | "solar" | "wind" | "battery" | "geothermal" | "other";
interface Region { mix: Record<MixFuel, number>; dominant: MixFuel; clean: number; demand_mw: number | null; through: string }
interface PowerDealLite { id: string; from: string; to: string; title: string; amount_usd: number | null; amount_kind: "confirmed" | "up_to" | "estimated" | "undisclosed"; date: string; status: string; plant_ids: string[]; datacenter_ids: string[]; source: { url: string; publisher: string } }
interface EnergyData {
  companies: { id: string; name: string; sector: Sector }[];
  datacenters: DataCenter[];
  plants: PlantRow[];
  plantsAsOf: string;
  arcs: { deal: string; from: string; dc: string; plant: string; source: [number, number]; target: [number, number] }[];
  powerDeals: PowerDealLite[];
  grid: { updated: string; via: string; regions: Record<string, Region> } | null;
  prices: { latest_month: string; latest: Record<string, { residential: number | null; residential_prev: number | null }>; history: Record<string, { year: number; residential: number | null }[]> } | null;
}

export const FUEL_COLOR: Record<string, [number, number, number]> = {
  gas: [255, 138, 61],
  nuclear: [192, 132, 252],
  coal: [140, 140, 150],
  solar: [255, 214, 10],
  wind: [52, 211, 153],
  hydro: [59, 130, 246],
  battery: [244, 114, 182],
  oil: [180, 83, 9],
  geothermal: [239, 68, 68],
  other: [100, 116, 139],
};
const FUEL_LABEL: Record<string, string> = { gas: "Gas", nuclear: "Nuclear", coal: "Coal", solar: "Solar", wind: "Wind", hydro: "Hydro", battery: "Batteries", oil: "Oil", geothermal: "Geothermal", other: "Other" };
const STATUS_COLOR: Record<DataCenter["status"], [number, number, number]> = { operating: [255, 255, 255], under_construction: [34, 211, 238], planned: [148, 163, 184] };
const STATUS_LABEL: Record<DataCenter["status"], string> = { operating: "Operating", under_construction: "Under construction", planned: "Planned" };
const rgb = (c: [number, number, number]) => `rgb(${c.join(",")})`;

type LayerKey = "datacenters" | "plants" | "deals" | "grid" | "prices";
const LAYER_LABEL: Record<LayerKey, string> = { datacenters: "Data centers", plants: "Power plants", deals: "Power deals", grid: "Grid regions", prices: "Electricity prices" };

const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json";

function priceColor(c: number): [number, number, number, number] {
  // 8¢ (cheap, dark blue) -> 30¢+ (expensive, hot pink)
  const t = Math.max(0, Math.min(1, (c - 8) / 22));
  return [Math.round(40 + 215 * t), Math.round(70 + 40 * (1 - t)), Math.round(160 - 40 * t), 110];
}

export function EnergyMap() {
  const params = useSearchParams();
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const [data, setData] = useState<EnergyData | null>(null);
  const [regions, setRegions] = useState<GeoJSON.FeatureCollection | null>(null);
  const [states, setStates] = useState<GeoJSON.FeatureCollection | null>(null);
  const [layers, setLayersState] = useState<Record<LayerKey, boolean>>(() => {
    const l = params.get("layers");
    const on = l ? new Set(l.split(",")) : new Set(["datacenters", "plants", "deals"]);
    return Object.fromEntries((Object.keys(LAYER_LABEL) as LayerKey[]).map((k) => [k, on.has(k)])) as Record<LayerKey, boolean>;
  });
  // Layer choices are part of the URL so a map view can be shared.
  const setLayers = (next: Record<LayerKey, boolean>) => {
    setLayersState(next);
    const p = new URLSearchParams(window.location.search);
    p.set("layers", (Object.keys(next) as LayerKey[]).filter((k) => next[k]).join(","));
    window.history.replaceState(null, "", `/energy?${p}`);
  };
  const [fuels, setFuels] = useState<Set<string>>(new Set(Object.keys(FUEL_COLOR)));
  const [selected, setSelected] = useState<string | null>(params.get("dc"));
  const [stateSel, setStateSel] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; html: React.ReactNode } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const owner = params.get("owner");

  useEffect(() => {
    fetch("/data/energy.json").then((r) => r.json()).then(setData);
  }, []);
  useEffect(() => {
    if (layers.grid && !regions) fetch("/data/grid-regions.json").then((r) => r.json()).then(setRegions);
    if (layers.prices && !states) fetch("/data/us-states.json").then((r) => r.json()).then(setStates);
  }, [layers.grid, layers.prices, regions, states]);

  const companies = useMemo(() => new Map((data?.companies ?? []).map((c) => [c.id, c])), [data]);
  const plantById = useMemo(() => new Map((data?.plants ?? []).map((p) => [p[0], p])), [data]);
  const dcSel = data?.datacenters.find((d) => d.id === selected) ?? null;

  // map setup
  useEffect(() => {
    if (!mapEl.current || map.current) return;
    maplibregl.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
    const m = new maplibregl.Map({ container: mapEl.current, style: STYLE, center: [-96, 38.5], zoom: 3.6, minZoom: 2.5, maxZoom: 12, attributionControl: { compact: true } });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    const o = new MapboxOverlay({ interleaved: false, layers: [] });
    m.addControl(o);
    map.current = m;
    overlay.current = o;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // fly to an owner's data centers (link from the Money Graph) or the selected one
  useEffect(() => {
    if (!data || !map.current) return;
    const focus = selected ? data.datacenters.filter((d) => d.id === selected) : owner ? data.datacenters.filter((d) => d.owner === owner || d.tenants.includes(owner)) : [];
    if (!focus.length) return;
    if (focus.length === 1) map.current.flyTo({ center: [focus[0].location.lon, focus[0].location.lat], zoom: 6, duration: 900 });
    else {
      const b = new maplibregl.LngLatBounds();
      focus.forEach((d) => b.extend([d.location.lon, d.location.lat]));
      map.current.fitBounds(b, { padding: 120, duration: 900, maxZoom: 6 });
    }
  }, [data, owner, selected]);

  useEffect(() => {
    if (!overlay.current || !data) return;
    const ownerSet = owner ? new Set(data.datacenters.filter((d) => d.owner === owner || d.tenants.includes(owner)).map((d) => d.id)) : null;
    const plantRows = data.plants.filter((p) => fuels.has(p[3]));
    const out = [];
    if (layers.prices && states && data.prices) {
      out.push(
        new GeoJsonLayer({
          id: "prices",
          data: states,
          filled: true,
          stroked: true,
          getLineColor: [255, 255, 255, 40],
          lineWidthMinPixels: 0.5,
          getFillColor: (f: GeoJSON.Feature) => {
            const p = data.prices!.latest[(f.properties as { state: string }).state]?.residential;
            return p ? priceColor(p) : [0, 0, 0, 0];
          },
          pickable: true,
          onClick: (i) => i.object && setStateSel((i.object.properties as { state: string }).state),
          onHover: (i) => {
            if (!i.object) return setHover(null);
            const st = (i.object.properties as { state: string; name: string });
            const p = data.prices!.latest[st.state];
            setHover({ x: i.x, y: i.y, html: <span><b>{st.name}</b>: {p?.residential?.toFixed(1)}¢/kWh for homes ({data.prices!.latest_month}) · click for the trend</span> });
          },
          updateTriggers: { getFillColor: [data.prices.latest_month] },
        }),
      );
    }
    if (layers.grid && regions && data.grid) {
      const sorted = { ...regions, features: [...regions.features].sort((a, b) => JSON.stringify(b.geometry).length - JSON.stringify(a.geometry).length) };
      out.push(
        new GeoJsonLayer({
          id: "grid",
          data: sorted,
          filled: true,
          stroked: true,
          getLineColor: [255, 255, 255, 70],
          lineWidthMinPixels: 0.8,
          getFillColor: (f: GeoJSON.Feature) => {
            const r = data.grid!.regions[(f.properties as { ba: string }).ba];
            return r ? [...FUEL_COLOR[r.dominant], 70] : [60, 60, 70, 30];
          },
          pickable: true,
          onHover: (i) => {
            if (!i.object) return setHover(null);
            const pr = i.object.properties as { ba: string; name: string };
            const r = data.grid!.regions[pr.ba];
            setHover({ x: i.x, y: i.y, html: <RegionCard code={pr.ba} name={pr.name} r={r} /> });
          },
        }),
      );
    }
    if (layers.plants) {
      out.push(
        new ScatterplotLayer<PlantRow>({
          id: "plants",
          data: plantRows,
          getPosition: (p) => [p[6], p[5]],
          getRadius: (p) => Math.sqrt(p[4]) * 160,
          radiusMinPixels: 1.5,
          radiusMaxPixels: 14,
          getFillColor: (p) => [...FUEL_COLOR[p[3]], 190],
          pickable: true,
          onHover: (i) => {
            if (!i.object) return setHover(null);
            const p = i.object;
            setHover({ x: i.x, y: i.y, html: <span><b>{p[1]}</b> · {FUEL_LABEL[p[3]]} · {fmtMw(p[4])}<br /><span className="text-muted">{p[2]} · {p[7]}{p[8] ? ` · grid ${p[8]}` : ""}</span></span> });
          },
          updateTriggers: { getFillColor: [fuels.size] },
        }),
      );
    }
    if (layers.deals) {
      out.push(
        new ArcLayer({
          id: "arcs",
          data: data.arcs,
          getSourcePosition: (a) => a.source,
          getTargetPosition: (a) => a.target,
          getSourceColor: (a) => [...hexRgb(SECTOR_INFO[companies.get(a.from)?.sector ?? "power"].color), 230],
          getTargetColor: [255, 225, 77, 230],
          getWidth: 2.5,
          getHeight: 0.6,
          greatCircle: false,
          pickable: true,
          onHover: (i) => {
            if (!i.object) return setHover(null);
            const a = i.object;
            const d = data.powerDeals.find((x) => x.id === a.deal);
            const p = plantById.get(a.plant);
            setHover({ x: i.x, y: i.y, html: <span><b>{companies.get(a.from)?.name}</b> buys power from <b>{p?.[1]}</b><br /><span className="text-muted">{d?.title}</span></span> });
          },
        }),
      );
    }
    if (layers.datacenters) {
      out.push(
        new ScatterplotLayer<DataCenter>({
          id: "dc-glow",
          data: data.datacenters,
          getPosition: (d) => [d.location.lon, d.location.lat],
          getRadius: (d) => Math.sqrt(Math.max(d.power_mw_planned, 30)) * 2200,
          radiusMinPixels: 6,
          radiusMaxPixels: 46,
          getFillColor: (d) => [...STATUS_COLOR[d.status], ownerSet && !ownerSet.has(d.id) ? 8 : 40],
          stroked: false,
        }),
        new ScatterplotLayer<DataCenter>({
          id: "datacenters",
          data: data.datacenters,
          getPosition: (d) => [d.location.lon, d.location.lat],
          getRadius: (d) => Math.sqrt(Math.max(d.power_mw_planned, 30)) * 900,
          radiusMinPixels: 3.5,
          radiusMaxPixels: 22,
          getFillColor: (d) => [...STATUS_COLOR[d.status], ownerSet && !ownerSet.has(d.id) ? 40 : 220],
          stroked: true,
          getLineColor: (d) => (d.id === selected ? [255, 255, 255, 255] : [0, 0, 0, 160]),
          getLineWidth: (d) => (d.id === selected ? 3 : 1),
          lineWidthUnits: "pixels",
          pickable: true,
          onClick: (i) => i.object && pick(i.object.id),
          onHover: (i) => {
            if (!i.object) return setHover(null);
            const d = i.object as DataCenter;
            setHover({ x: i.x, y: i.y, html: <span><b>{d.name}</b> · {STATUS_LABEL[d.status]}<br /><span className="text-muted">{companies.get(d.owner)?.name} · {fmtMw(d.power_mw_now)} now · {fmtMw(d.power_mw_planned)} planned</span></span> });
          },
          updateTriggers: { getLineColor: [selected], getLineWidth: [selected], getFillColor: [owner] },
        }),
      );
    }
    overlay.current.setProps({ layers: out });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, layers, fuels, selected, owner, regions, states, companies, plantById]);

  function pick(id: string | null) {
    setSelected(id);
    setStateSel(null);
    const p = new URLSearchParams(params.toString());
    if (id) p.set("dc", id);
    else p.delete("dc");
    window.history.replaceState(null, "", `/energy${p.size ? `?${p}` : ""}`);
  }

  const totals = useMemo(() => {
    const ds = data?.datacenters ?? [];
    return { now: ds.reduce((s, d) => s + d.power_mw_now, 0), planned: ds.reduce((s, d) => s + d.power_mw_planned, 0), n: ds.length };
  }, [data]);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div className="absolute inset-0">
        <div ref={mapEl} className="h-full w-full" aria-label="Map of US AI data centers and power plants" />
      </div>
      {hover && (
        <div className="panel pointer-events-none absolute z-30 max-w-xs rounded-lg px-3 py-2 text-xs leading-relaxed" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          {hover.html}
        </div>
      )}

      {/* layer controls */}
      <div className={`absolute left-3 top-3 z-20 w-72 max-md:left-2 max-md:right-2 max-md:w-auto ${panelOpen ? "" : "max-md:hidden"}`}>
        <div className="panel space-y-3 rounded-xl p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-muted">Layers</span>
            <button className="md:hidden" onClick={() => setPanelOpen(false)} aria-label="Close layers">
              <X size={16} />
            </button>
          </div>
          {(Object.keys(LAYER_LABEL) as LayerKey[]).map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 text-xs">
              <input type="checkbox" className="accent-white" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />
              {k === "deals" ? <Term t="PPA">{LAYER_LABEL[k]}</Term> : k === "grid" ? <Term t="balancing authority">{LAYER_LABEL[k]}</Term> : LAYER_LABEL[k]}
            </label>
          ))}
          {layers.datacenters && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-2 text-xs text-muted">
              {(Object.keys(STATUS_COLOR) as DataCenter["status"][]).map((s: DataCenter["status"]) => (
                <span key={s} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: rgb(STATUS_COLOR[s]) }} />
                  {STATUS_LABEL[s]}
                </span>
              ))}
            </div>
          )}
          {layers.plants && (
            <div className="border-t border-line pt-2">
              <div className="mb-1 text-xs text-muted">Plants over 50 MW, by fuel</div>
              <div className="flex flex-wrap gap-1">
                {Object.keys(FUEL_COLOR).map((f) => {
                  const on = fuels.has(f);
                  return (
                    <button
                      key={f}
                      onClick={() => {
                        const n = new Set(fuels);
                        if (on) n.delete(f);
                        else n.add(f);
                        setFuels(n);
                      }}
                      className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs ${on ? "border-line-strong text-fg" : "border-line text-dim opacity-50"}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: rgb(FUEL_COLOR[f]) }} />
                      {FUEL_LABEL[f]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {layers.grid && data?.grid && (
            <p className="border-t border-line pt-2 text-xs leading-relaxed text-dim">
              Regions are colored by the fuel that made the most power in the last 24 hours (EIA-930, updated {fmtDate(data.grid.updated.slice(0, 10))}). Boundaries are approximate.
            </p>
          )}
          {layers.prices && data?.prices && (
            <div className="border-t border-line pt-2 text-xs text-dim">
              <div className="mb-1 h-2 rounded-full" style={{ background: `linear-gradient(90deg, rgba(40,110,160,.9), rgba(255,70,120,.9))` }} />
              <div className="flex justify-between"><span>8¢</span><span>Home price per kWh, {data.prices.latest_month}</span><span>30¢+</span></div>
            </div>
          )}
          <div className="num border-t border-line pt-2 text-xs text-muted">
            {totals.n} AI data centers · {fmtMw(totals.now)} now · {fmtMw(totals.planned)} planned
          </div>
          <ExplainBox>
            <WithTerms text="Each white circle is a big AI data center, sized by how much power it will use. Colored dots are power plants. Arcs connect companies to the specific plants they signed deals to buy power from. AI data centers use as much electricity as small cities, which is why tech companies are now buying power from nuclear plants." />
          </ExplainBox>
          <p className="text-xs text-dim">
            Data centers: <a className="underline" href="https://epoch.ai/data/data-centers">Epoch AI</a> (CC-BY), sites of roughly 100 MW+. Plants: EIA-860M ({data?.plantsAsOf.replace("Inventory of Operating Generators as of ", "") || "…"}).
          </p>
        </div>
      </div>
      <button onClick={() => setPanelOpen(true)} className="panel absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs md:hidden">
        <Stack size={14} /> Layers
      </button>

      {owner && companies.get(owner) && (
        <div className="panel absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1.5 text-xs">
          Showing data centers of <b>{companies.get(owner)!.name}</b>
          <Link href={`/?c=${owner}`} className="underline">open in Money Graph</Link>
          <button onClick={() => window.history.replaceState(null, "", "/energy")} aria-label="Clear owner filter">
            <X size={13} />
          </button>
        </div>
      )}

      {dcSel && data && (
        <DataCenterCard dc={dcSel} data={data} companies={companies} plantById={plantById} onClose={() => pick(null)} />
      )}
      {stateSel && data?.prices && <StateCard st={stateSel} prices={data.prices} onClose={() => setStateSel(null)} />}
    </div>
  );
}

/** Estimates get two significant figures: 1,018,696 -> "1.0M". */
function roughCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function MixBar({ mix }: { mix: Record<string, number> }) {
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
      {Object.entries(mix)
        .filter(([, v]) => v > 0.005)
        .sort((a, b) => b[1] - a[1])
        .map(([f, v]) => (
          <div key={f} style={{ width: `${v * 100}%`, background: rgb(FUEL_COLOR[f]) }} title={`${FUEL_LABEL[f]} ${Math.round(v * 100)}%`} />
        ))}
    </div>
  );
}

function RegionCard({ code, name, r }: { code: string; name: string; r?: Region }) {
  return (
    <div className="w-60">
      <div className="font-semibold">{name}</div>
      <div className="num text-xs text-muted">{code}</div>
      {r ? (
        <>
          <div className="mt-1.5"><MixBar mix={r.mix} /></div>
          <div className="mt-1 text-xs text-muted">
            Mostly {FUEL_LABEL[r.dominant].toLowerCase()} · {Math.round(r.clean * 100)}% clean (nuclear, hydro, wind, solar)
          </div>
        </>
      ) : (
        <div className="text-xs text-dim">No hourly data reported.</div>
      )}
    </div>
  );
}

function DataCenterCard({
  dc,
  data,
  companies,
  plantById,
  onClose,
}: {
  dc: DataCenter;
  data: EnergyData;
  companies: Map<string, { id: string; name: string; sector: Sector }>;
  plantById: Map<string, PlantRow>;
  onClose: () => void;
}) {
  const ownerC = companies.get(dc.owner);
  const deals = data.powerDeals.filter((d) => d.datacenter_ids.includes(dc.id) || dc.power_deal_ids.includes(d.id) || (d.from === dc.owner && d.plant_ids.length > 0));
  const region = data.grid?.regions[dc.grid_region];
  return (
    <aside className="panel absolute bottom-3 right-3 top-3 z-30 flex w-[24rem] flex-col overflow-hidden rounded-2xl max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:max-h-[75vh] max-md:w-auto max-md:rounded-b-none">
      <div className="flex items-start justify-between border-b border-line p-4">
        <div>
          <h2 className="text-lg font-semibold">{dc.name}</h2>
          <div className="text-xs text-muted">
            {dc.location.city ? `${dc.location.city}, ` : ""}
            {dc.state} · <span style={{ color: rgb(STATUS_COLOR[dc.status]) }}>{STATUS_LABEL[dc.status]}</span>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded p-1 text-muted hover:bg-white/10">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <ExplainBox>
          <WithTerms text={dc.explain} />
        </ExplainBox>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Owner">
            {ownerC ? (
              <Link href={`/?c=${dc.owner}`} className="underline-offset-2 hover:underline" style={{ color: SECTOR_INFO[ownerC.sector].color }}>
                {ownerC.name} →
              </Link>
            ) : (
              dc.owner
            )}
          </Stat>
          <Stat label="Main tenant">
            {dc.tenants.length
              ? dc.tenants.map((t, i) => (
                  <span key={t}>
                    {i > 0 && ", "}
                    <Link href={`/?c=${t}`} className="hover:underline">{companies.get(t)?.name ?? t}</Link>
                  </span>
                ))
              : "n/a"}
          </Stat>
          <Stat label={<Term t="MW">Power now</Term>}><span className="num">{fmtMw(dc.power_mw_now)}</span></Stat>
          <Stat label="Power planned"><span className="num">{fmtMw(dc.power_mw_planned)}</span></Stat>
          <Stat label={<Term t="H100-equivalents">Est. chips</Term>}>
            <span className="num">{dc.est_chips ? `~${roughCount(dc.est_chips.count)}` : "n/a"}</span>
          </Stat>
          <Stat label="Est. cost"><span className="num">{dc.est_cost_usd ? `~${fmtUsd(dc.est_cost_usd)}` : "n/a"}</span></Stat>
        </div>
        <div>
          <h3 className="mb-1.5 text-xs font-medium tracking-wider text-muted">
            <Term t="balancing authority">Grid region</Term>: <span className="num text-fg">{dc.grid_region}</span>
          </h3>
          {region ? (
            <>
              <MixBar mix={region.mix} />
              <p className="mt-1 text-xs text-dim">
                Last 24h: mostly {FUEL_LABEL[region.dominant].toLowerCase()}, {Math.round(region.clean * 100)}% clean. Region estimated from the nearest power plants.
              </p>
            </>
          ) : (
            <p className="text-xs text-dim">No hourly mix reported for this region.</p>
          )}
        </div>
        <div>
          <h3 className="mb-1.5 text-xs font-medium tracking-wider text-muted">Power sources</h3>
          {deals.length === 0 && <p className="text-xs text-dim">No dedicated power deal tracked; it draws from the local grid.</p>}
          <ul className="space-y-2">
            {deals.map((d) => (
              <li key={d.id} className="rounded-lg border border-line p-2.5">
                <div className="text-xs font-medium">{d.title}</div>
                <div className="num mt-0.5 text-xs text-muted">
                  {fmtDealAmount(d.amount_usd, d.amount_kind)} · {fmtDate(d.date)}
                </div>
                {d.plant_ids.length > 0 && (
                  <div className="mt-1 text-xs text-muted">
                    {d.plant_ids.map((p) => plantById.get(p)?.[1]).filter(Boolean).join(", ")}
                  </div>
                )}
                <a href={d.source.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-dim hover:text-fg">
                  {d.source.publisher} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
        {dc.timeline.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-xs font-medium tracking-wider text-muted">Build timeline</h3>
            <ol className="space-y-2 border-l border-line pl-3">
              {dc.timeline.map((t, i) => (
                <li key={i} className="text-xs">
                  <div className="num text-xs text-dim">{fmtDate(t.date)}</div>
                  <div className="text-fg/80">{t.event}</div>
                </li>
              ))}
            </ol>
          </div>
        )}
        <p className="text-xs text-dim">
          Source:{" "}
          {dc.sources.map((s, i) => (
            <a key={i} href={s.url} className="underline" target="_blank" rel="noopener noreferrer">
              {s.publisher}
            </a>
          ))}
          . Chips and cost are estimates.
        </p>
      </div>
    </aside>
  );
}

function Stat({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line p-2.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

function StateCard({ st, prices, onClose }: { st: string; prices: NonNullable<EnergyData["prices"]>; onClose: () => void }) {
  const p = prices.latest[st];
  const hist = (prices.history[st] ?? []).filter((r) => r.residential !== null);
  const change = p?.residential && p.residential_prev ? ((p.residential - p.residential_prev) / p.residential_prev) * 100 : null;
  return (
    <aside className="panel absolute bottom-3 right-3 z-30 w-80 rounded-2xl p-4 text-sm max-md:inset-x-0 max-md:bottom-0 max-md:w-auto max-md:rounded-b-none">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Electricity prices · {st}</h2>
        <button onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      {p?.residential && (
        <div className="mt-2">
          <span className="num text-2xl">{p.residential.toFixed(1)}¢</span> <span className="text-xs text-muted">per kWh for homes, {prices.latest_month}</span>
          {change !== null && (
            <div className={`num text-xs ${change > 0 ? "text-bad" : "text-good"}`}>
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}% vs. a year earlier
            </div>
          )}
        </div>
      )}
      <div className="mt-3 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={hist}>
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#8b93a4" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#8b93a4" }} width={28} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "#0b0f17", border: "1px solid rgba(148,163,184,.28)", fontSize: 11 }} formatter={(v) => [`${v}¢/kWh`, "Homes"]} />
            <Line type="monotone" dataKey="residential" stroke="#ffffff" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-dim">
        Average price homes paid per kilowatt-hour (EIA). Yearly history runs {hist[0]?.year}–{hist.at(-1)?.year}; the headline number is the newest month. Data centers are one of several reasons prices are rising.
      </p>
    </aside>
  );
}
