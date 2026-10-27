"use client";

import { ArrowsClockwise, Funnel, LinkSimple, Pause, Play, ShareNetwork, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Term } from "@/components/explain";
import { DEAL_TYPE_LABEL, fmtMonth, fmtUsd } from "@/lib/format";
import { DEAL_TYPES, type DealType, type Sector } from "@/lib/schema";
import { SECTOR_INFO, SECTOR_ORDER } from "@/lib/sectors";
import type { ViewState } from "@/lib/view-state";

type Set = (patch: Partial<ViewState>) => void;

export function Legend({ view, set, counts }: { view: ViewState; set: Set; counts: Record<Sector, number> }) {
  return (
    <div className="panel rounded-xl p-2.5" data-tour="legend">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-xs font-medium tracking-wide text-muted">Sectors</span>
        <button className="text-xs text-dim hover:text-fg" onClick={() => set({ all: !view.all })}>
          {view.all ? "Top 50 only" : "Show all"}
        </button>
      </div>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {SECTOR_ORDER.map((s) => {
          const hidden = view.hiddenSectors.includes(s);
          return (
            <li key={s}>
              <button
                className={`flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs transition hover:bg-white/5 ${hidden ? "opacity-35" : ""}`}
                onClick={() => set({ hiddenSectors: hidden ? view.hiddenSectors.filter((x) => x !== s) : [...view.hiddenSectors, s] })}
                title={SECTOR_INFO[s].explain}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SECTOR_INFO[s].color, boxShadow: hidden ? "none" : `0 0 6px ${SECTOR_INFO[s].color}` }} />
                <span className="truncate">{SECTOR_INFO[s].short}</span>
                <span className="num ml-auto text-dim">{counts[s] ?? 0}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center gap-3 border-t border-line px-1 pt-2 text-xs text-muted">
        <span className="flex items-center gap-1">
          <svg width="22" height="4"><line x1="0" y1="2" x2="22" y2="2" stroke="#cbd5e1" strokeWidth="2" /></svg>
          <Term t="confirmed">confirmed</Term>
        </span>
        <span className="flex items-center gap-1">
          <svg width="22" height="4"><line x1="0" y1="2" x2="22" y2="2" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 3" /></svg>
          announced / <Term t="up to">up to</Term>
        </span>
      </div>
      <div className="mt-2 border-t border-line px-1 pt-1.5 text-xs text-dim">
        Not investment advice ·{" "}
        <a href="/methodology" className="underline-offset-2 hover:text-fg hover:underline">
          How the data is checked
        </a>
      </div>
    </div>
  );
}

const MIN_STEPS = [0, 1e8, 1e9, 5e9, 1e10, 5e10];

export function FilterPanel({ view, set, onClose }: { view: ViewState; set: Set; onClose: () => void }) {
  const toggleType = (t: DealType) => set({ types: view.types.includes(t) ? view.types.filter((x) => x !== t) : [...view.types, t] });
  return (
    <div className="panel w-72 space-y-4 rounded-xl p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">Filters</span>
        <button onClick={onClose} className="text-muted hover:text-fg" aria-label="Close filters">
          <X size={16} />
        </button>
      </div>
      <div>
        <div className="mb-1.5 text-xs text-muted">Deal type</div>
        <div className="flex flex-wrap gap-1.5">
          {DEAL_TYPES.map((t) => {
            const on = view.types.includes(t);
            return (
              <button key={t} onClick={() => toggleType(t)} className={`rounded-full border px-2 py-0.5 text-xs ${on ? "border-white bg-white text-black" : "border-line text-muted hover:text-fg"}`}>
                {DEAL_TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span>Minimum size</span>
          <span className="num text-fg">{view.minAmount ? fmtUsd(view.minAmount) : "any"}</span>
        </div>
        <input
          type="range"
          min={0}
          max={MIN_STEPS.length - 1}
          value={Math.max(0, MIN_STEPS.indexOf(view.minAmount))}
          onChange={(e) => set({ minAmount: MIN_STEPS[Number(e.target.value)] })}
          className="w-full accent-white"
          aria-label="Minimum deal size"
        />
      </div>
      <div>
        <div className="mb-1.5 text-xs text-muted">Certainty</div>
        <div className="flex gap-1 rounded-lg bg-white/5 p-1 text-xs">
          {(["all", "confirmed", "announced"] as const).map((c) => (
            <button key={c} onClick={() => set({ certainty: c })} className={`flex-1 rounded-md px-2 py-1 capitalize ${view.certainty === c ? "bg-white/15 text-fg" : "text-muted"}`}>
              {c === "announced" ? "Announced / up to" : c}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={view.hideCanceled} onChange={(e) => set({ hideCanceled: e.target.checked })} className="accent-white" />
        Hide canceled deals
      </label>
    </div>
  );
}

/** Drag from 2019 to today and watch the web grow; Play replays it. */
export function TimeSlider({ view, set, range }: { view: ViewState; set: Set; range: { from: string; to: string } }) {
  const start = new Date(`${range.from.slice(0, 4)}-01-01T00:00:00Z`).getTime();
  const end = new Date(range.to + "T00:00:00Z").getTime();
  const months = Math.max(1, Math.round((end - start) / (30.44 * 864e5)));
  const toIdx = (d: string | null) => (d ? Math.round((new Date(d + "T00:00:00Z").getTime() - start) / (30.44 * 864e5)) : months);
  const toDate = (i: number) => (i >= months ? null : new Date(start + i * 30.44 * 864e5).toISOString().slice(0, 10));
  const [playing, setPlaying] = useState(false);
  const idx = useRef(toIdx(view.date));
  useEffect(() => {
    idx.current = toIdx(view.date);
  });

  useEffect(() => {
    if (!playing) return;
    if (idx.current >= months) set({ date: toDate(0) });
    const t = setInterval(() => {
      const next = idx.current + 1;
      if (next >= months) {
        set({ date: null });
        setPlaying(false);
      } else set({ date: toDate(next) });
    }, 140);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  return (
    <div className="panel flex items-center gap-3 rounded-xl px-3 py-2" data-tour="time">
      <button onClick={() => setPlaying(!playing)} className="rounded-full bg-white/10 p-1.5 hover:bg-white/20" aria-label={playing ? "Pause replay" : "Replay 2019 to today"}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <span className="num w-9 text-xs text-dim">{range.from.slice(0, 4)}</span>
      <input
        type="range"
        min={0}
        max={months}
        value={toIdx(view.date)}
        onChange={(e) => set({ date: toDate(Number(e.target.value)) })}
        className="min-w-0 flex-1 accent-white"
        aria-label="Time slider"
      />
      <span className="num w-20 text-right text-xs">{view.date ? fmtMonth(view.date) : "Today"}</span>
    </div>
  );
}

export function ToolBar({
  view,
  set,
  onFilters,
  filtersActive,
  loopCount,
}: {
  view: ViewState;
  set: Set;
  onFilters: () => void;
  filtersActive: boolean;
  loopCount: number;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="panel flex flex-wrap items-center gap-1 rounded-xl p-1 text-xs" data-tour="tools">
      <button onClick={onFilters} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${filtersActive ? "bg-white text-black" : "text-muted hover:bg-white/10 hover:text-fg"}`}>
        <Funnel size={13} /> Filters
      </button>
      <button
        onClick={() => set({ loops: !view.loops })}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${view.loops ? "bg-white text-black" : "text-muted hover:bg-white/10 hover:text-fg"}`}
        title="Highlight circular deals, where money comes back to where it started"
      >
        <ArrowsClockwise size={13} /> <Term t="circular deal">Loops</Term> <span className="num opacity-60">{loopCount}</span>
      </button>
      {view.company && (
        <div className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1" title="Follow the money: light up companies 1, 2 or 3 steps away">
          <LinkSimple size={13} className="text-muted" />
          <span className="text-muted">Steps</span>
          {[1, 2, 3].map((h) => (
            <button key={h} onClick={() => set({ hops: h as 1 | 2 | 3 })} className={`num rounded px-1.5 ${view.hops === h ? "bg-white text-black" : "text-muted hover:text-fg"}`}>
              {h}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted hover:bg-white/10 hover:text-fg"
        title="Copy a link to exactly this view"
      >
        <ShareNetwork size={13} /> {copied ? "Copied!" : "Share"}
      </button>
    </div>
  );
}
