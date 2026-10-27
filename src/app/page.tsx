import { Suspense } from "react";
import { MoneyAtlas } from "@/components/money/MoneyAtlas";
import { dataCenterOwners } from "@/lib/data-server";

export default function Home() {
  const owners = dataCenterOwners();
  return (
    <main className="starfield relative flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden max-md:mt-9 max-md:h-[calc(100dvh-5.75rem)]">
      <h1 className="sr-only">AI Atlas Money Graph: how money moves between AI companies</h1>
      <Suspense fallback={null}>
        <MoneyAtlas dcOwners={owners} />
      </Suspense>
    </main>
  );
}
