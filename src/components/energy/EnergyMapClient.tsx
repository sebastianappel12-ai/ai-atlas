"use client";

import dynamic from "next/dynamic";

/** MapLibre and deck.gl need the browser, so the map only renders client-side. */
export const EnergyMapClient = dynamic(() => import("./EnergyMap").then((m) => m.EnergyMap), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <div className="num animate-pulse text-xs uppercase tracking-[0.3em] text-muted">Loading the energy map…</div>
    </div>
  ),
});
