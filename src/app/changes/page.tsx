import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteHeader";
import { readChangelogs, readGraph } from "@/lib/data-server";
import { fmtDate, fmtDealAmount } from "@/lib/format";

export const metadata: Metadata = {
  title: "What changed",
  description: "Every deal AI Atlas added or updated, day by day. Checked by the daily update agent and, when needed, by a human.",
};

const KIND_LABEL = { added: "New", updated: "Updated", revised: "Revised", canceled: "Canceled", rechecked: "Re-checked" } as const;
const VIA_LABEL = { auto: "auto-published from an official source", review: "approved by a human", manual: "added by hand" } as const;

export default function ChangesPage() {
  const logs = readChangelogs();
  const g = readGraph();
  const deals = new Map(g.deals.map((d) => [d.id, d]));
  const companies = new Map(g.companies.map((c) => [c.id, c]));
  return (
    <>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="hero-heading text-4xl font-semibold">What changed</h1>
        <p className="mt-2 text-muted">
          Every morning an update agent reads new SEC filings, company press releases and news. Deals it can prove from an official source are published
          automatically; everything else waits for a human to approve it. This page lists every change.
        </p>
        {logs.length === 0 && <p className="mt-8 text-dim">No changes logged yet.</p>}
        {logs.map((log) => (
          <Reveal key={log.date} className="mt-8">
            <h2 className="num text-sm tracking-wide text-muted">{fmtDate(log.date)}</h2>
            <ul className="mt-3 space-y-2">
              {log.entries.map((e, i) => {
                const d = e.record === "deal" ? deals.get(e.id) : undefined;
                return (
                  <li key={i} className="panel rounded-lg p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`num mr-2 rounded px-1.5 py-0.5 text-xs ${e.kind === "added" ? "bg-good/15 text-good" : e.kind === "canceled" ? "bg-bad/15 text-bad" : "bg-white/10 text-muted"}`}>
                          {KIND_LABEL[e.kind]}
                        </span>
                        {d ? (
                          <Link href={`/graph?c=${d.to}`} className="hover:underline">{d.title}</Link>
                        ) : (
                          <span>{e.summary}</span>
                        )}
                        {d && (
                          <div className="mt-1 text-xs text-muted">
                            {companies.get(d.from)?.name} → {companies.get(d.to)?.name} · {fmtDealAmount(d.amount_usd, d.amount_kind)} ·{" "}
                            <a href={d.sources[0].url} className="underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">{d.sources[0].publisher}</a>
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-dim">{VIA_LABEL[e.via]}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
