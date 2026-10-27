"use client";

import dynamic from "next/dynamic";

/** MapLibre and deck.gl need the browser, so the map only renders client-side. */
export const EnergyMapClient = dynamic(() => import("./EnergyMap").then((m) => m.EnergyMap), {
  ssr: false,
  loading: () => (
    <div className="relative flex-1" aria-busy="true" aria-label="Loading the energy map">
      <div className="skeleton absolute inset-0 opacity-40" />
      <div className="absolute left-3 top-3 w-72 space-y-3 rounded-xl bg-elev p-3 max-md:hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-4 rounded" style={{ width: `${60 + ((i * 17) % 30)}%` }} />
        ))}
      </div>
    </div>
  ),
});
