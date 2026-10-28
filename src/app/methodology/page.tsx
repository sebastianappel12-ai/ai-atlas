import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteHeader";
import { readDataCenters, readGraph } from "@/lib/data-server";
import { SECTOR_INFO, SECTOR_ORDER } from "@/lib/sectors";

export const metadata: Metadata = {
  title: "Methodology",
  description: "Where AI Atlas data comes from, how every deal is checked, and what the site does not cover. Not investment advice.",
};

export default function MethodologyPage() {
  const g = readGraph();
  const dcs = readDataCenters();
  const official = g.deals.filter((d) => d.sources.some((s) => s.kind === "sec_filing" || s.kind === "press_release")).length;
  return (
    <>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 leading-relaxed [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-1 [&_p]:mt-3 [&_p]:text-fg/85 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-fg/85">
        <h1 className="hero-heading text-4xl font-semibold">Methodology</h1>
        <p>
          AI Atlas maps how money and power move through the AI industry. It tracks{" "}
          <span className="num">{g.companies.length}</span> companies, <span className="num">{g.deals.length}</span> deals and{" "}
          <span className="num">{dcs.length}</span> US data centers. <span className="num">{official}</span> of the deals cite an SEC filing or the company&apos;s own announcement.
        </p>

        <div className="mt-6 rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm">
          <strong>Not investment advice.</strong> AI Atlas is an information resource. Nothing here is a recommendation to buy or sell anything. Amounts can be
          wrong or out of date; always check the linked source.
        </div>

        <h2>The one rule</h2>
        <p>Every deal on the site has a source link and a date, and quotes one exact sentence from that source that proves the deal.</p>

        <h2>How a deal gets in</h2>
        <ul>
          <li>Deals are collected from SEC filings (8-K, 10-Q, 10-K, S-1), companies&apos; own press releases, and news reports.</li>
          <li>
            A program (not an AI) downloads the source page and checks that the quoted sentence really appears on it. This is what stops made-up deals. Sites that
            block automated checks are never bypassed; those deals need another source that can be checked.
          </li>
          <li>Every record is validated against a strict schema: no missing source, broken date, unknown company or backwards money direction gets through.</li>
          <li>
            New deals found by the daily update agent are published automatically only when they come from an SEC filing or the company&apos;s own announcement and pass
            every check. Everything else waits for a human to approve it. See <Link href="/changes" className="underline">What changed</Link>.
          </li>
          <li>Every week, older deals still marked &ldquo;announced&rdquo; are re-checked.</li>
        </ul>

        <h2>How to read the numbers</h2>
        <ul>
          <li><strong>Lines point the way money moves.</strong> Investor → company, chip buyer → chip maker, AI lab → cloud, data center owner → power company.</li>
          <li><strong>Confirmed</strong> (solid line): a firm amount in a filing or official release.</li>
          <li>
            <strong>Up to</strong> (dashed): a ceiling or headline that hasn&apos;t fully happened. <em>Up-to amounts are never added to confirmed totals</em>; they are shown separately.
          </li>
          <li><strong>Estimated</strong> (dashed): a figure from news reports or analysts. Private-company revenue and valuations are estimates and labeled that way, with a range when sources disagree.</li>
          <li><strong>Undisclosed</strong>: a real deal with no public number. Drawn as a thin line.</li>
          <li><strong>Deals are never deleted.</strong> If a deal changes or is canceled it is marked &ldquo;revised&rdquo; or &ldquo;canceled&rdquo; and linked to the new version. The time slider shows each version in turn.</li>
          <li>Dot size is annual revenue (or latest valuation for private companies; for investors, money put into tracked deals). Line thickness is on a log scale so a $300B contract doesn&apos;t hide a $2B one.</li>
          <li>Exposure score: the share of a company&apos;s reported backlog tied to its single biggest tracked customer. Shown only for companies that report a backlog.</li>
        </ul>

        <h2>Sectors</h2>
        <ul>
          {SECTOR_ORDER.map((s) => (
            <li key={s}>
              <span style={{ color: SECTOR_INFO[s].color }}>{SECTOR_INFO[s].label}</span>: {SECTOR_INFO[s].explain}
            </li>
          ))}
        </ul>

        <h2>Data sources</h2>
        <ul>
          <li><a className="underline" href="https://epoch.ai/data/data-centers">Epoch AI Frontier Data Centers</a>: power, chips, cost and timelines for the largest AI data centers. Licensed CC-BY; credit Epoch AI.</li>
          <li><a className="underline" href="https://www.sec.gov/edgar">SEC EDGAR</a>: public-company revenue (XBRL) and deal filings.</li>
          <li><a className="underline" href="https://www.eia.gov/electricity/data/eia860m/">EIA-860M</a>: every US power plant over 50 MW (public domain).</li>
          <li><a className="underline" href="https://www.eia.gov/electricity/gridmonitor/">EIA-930</a>: hourly fuel mix for each grid region.</li>
          <li><a className="underline" href="https://www.eia.gov/electricity/data/browser/">EIA electricity prices</a>: average retail price by state.</li>
          <li>Stock charts are TradingView widgets, which allow public display.</li>
          <li>News is linked, never copied: at most one quoted sentence per article.</li>
        </ul>

        <h2>What&apos;s not covered</h2>
        <ul>
          <li>The Energy Map covers US AI data centers of roughly 100 MW or more, starting from Epoch AI&apos;s list. Smaller sites are mostly missing.</li>
          <li>Power lines are not shown (the government&apos;s free transmission-line dataset was shut down in 2025).</li>
          <li>Many deals have no public dollar amount; totals only include disclosed numbers.</li>
          <li>Deals between companies outside the roughly {g.companies.length} tracked companies are not shown.</li>
        </ul>

        <h2>Found a mistake?</h2>
        <p>
          Every deal has a &ldquo;Report an error&rdquo; link, or{" "}
          <a className="underline" href="https://github.com/sebastianappel12-ai/ai-atlas/issues/new?template=report-error.yml">open a report on GitHub</a>. The data and code are
          open: <a className="underline" href="https://github.com/sebastianappel12-ai/ai-atlas">github.com/sebastianappel12-ai/ai-atlas</a>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
