import type { Metadata } from "next";
import { Suspense } from "react";
import { EnergyMapClient } from "@/components/energy/EnergyMapClient";

export const metadata: Metadata = {
  title: "Energy Map: AI data centers and the power behind them",
  description: "Every big US AI data center, the power plants and grid regions that feed it, the power deals tech companies signed, and electricity prices by state.",
};

export default function EnergyPage() {
  return (
    <main className="relative flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-bg max-md:mt-9 max-md:h-[calc(100dvh-5.75rem)]">
      <h1 className="sr-only">AI Atlas Energy Map</h1>
      <Suspense fallback={null}>
        <EnergyMapClient />
      </Suspense>
    </main>
  );
}

