import { Suspense } from "react";
import { MoneyAtlas } from "@/components/money/MoneyAtlas";
import { dataCenterOwners } from "@/lib/data-server";

export default function Home() {
  const owners = dataCenterOwners();
  return (
    <main id="main" className="grain relative flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      <h1 className="sr-only">AI Atlas Money Graph: how money moves between AI companies</h1>
      <Suspense fallback={null}>
        <MoneyAtlas dcOwners={owners} />
      </Suspense>
    </main>
  );
}
