import { ArrowRight, ArrowsClockwise, CheckCircle, Eye, Lightning, ListMagnifyingGlass, Path, SealCheck, Stack } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteHeader";
import { LegacyRedirect } from "@/components/landing/LegacyRedirect";
import { TaglineReveal } from "@/components/landing/TaglineReveal";
import { plantCount, readChangelogs, readDataCenters, readGraph, sourceSummary } from "@/lib/data-server";
import { fmtDate, fmtDealAmount, fmtMw, fmtUsd } from "@/lib/format";
import { currentDeals, findLoops, sumDeals } from "@/lib/graph";
import { SECTOR_INFO } from "@/lib/sectors";
import hero from "../../public/art/hero.webp";
import sourcesArt from "../../public/art/sources.webp";
import energyArt from "../../public/art/energy.webp";
import shotGraph from "../../public/art/shot-graph.webp";
import shotPanel from "../../public/art/shot-panel.webp";
import shotLoops from "../../public/art/shot-loops.webp";
import shotExplain from "../../public/art/shot-explain.webp";

export const metadata: Metadata = {
  title: { absolute: "AI Atlas: who pays whom in AI, with a source for every deal" },
  description:
    "A free, interactive map of the money moving through the AI industry: chip orders, cloud contracts, investments and power deals, each linked to the filing that proves it.",
  alternates: { canonical: "/" },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Where do the deals come from?",
    a: "SEC filings (8-K, 10-Q, 10-K, S-1), the companies' own press releases, and news reports. Every deal links to its source and quotes the exact sentence that proves it.",
  },
  {
    q: "How do you know a deal isn't made up?",
    a: "A program, not an AI, downloads the source page and checks the quoted sentence is really on it. Deals from news reports, or anything the checks flag, wait for a human to approve them.",
  },
  {
    q: "What does an \"up to\" amount mean?",
    a: "It's a ceiling, not a payment: the deal could reach that amount if everything goes to plan. Up to money is drawn as a dashed line and never added to confirmed totals.",
  },
  {
    q: "How often is it updated?",
    a: "Every morning. An update agent reads the day's new filings, press releases and news, publishes deals it can prove from an official source and sends the rest for review. See What changed for the log.",
  },
  {
    q: "Is this investment advice?",
    a: "No. AI Atlas is a reference tool. Figures can be estimated or out of date, so always check the linked source before relying on one.",
  },
  {
    q: "Which companies are covered?",
    a: "About 190 companies across ten sectors: AI labs, cloud giants, neoclouds, chip designers, chip factories, memory, networking and equipment, data center builders, power companies and investors.",
  },
  {
    q: "What does the Energy Map show?",
    a: "Every big US AI data center, with its power use and status, the power plants around it, the power deals tech companies signed, today's grid fuel mix and electricity prices by state.",
  },
  {
    q: "Found a mistake?",
    a: "Every deal has a Report an error link. Corrections never delete history: a changed deal is marked revised and linked to its new version.",
  },
];

function Cta({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/graph"
      className={`inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-base font-semibold text-black transition hover:-translate-y-0.5 hover:bg-white/90 ${className}`}
    >
      Open the Money Graph <ArrowRight size={16} weight="bold" aria-hidden />
    </Link>
  );
}

export default function Landing() {
  const g = readGraph();
  const live = currentDeals(g.deals).filter((d) => d.status !== "canceled");
  const totals = sumDeals(live);
  const loops = findLoops(currentDeals(g.deals));
  const dcs = readDataCenters();
  const plannedMw = dcs.reduce((s, d) => s + d.power_mw_planned, 0);
  const plants = plantCount();
  const checks = sourceSummary();
  const companies = new Map(g.companies.map((c) => [c.id, c]));
  const v1 = g.deals.find((d) => d.id === "nvidia-openai-investment-2025");
  const v2 = g.deals.find((d) => d.id === "nvidia-openai-investment-2026");
  const loop = loops.find((l) => l.companies.length === 2 && l.companies.includes("nvidia") && l.companies.includes("coreweave"));
  const recent = readChangelogs()
    .flatMap((log) => log.entries.filter((e) => e.record === "deal" && e.kind === "added").map((e) => ({ ...e, date: log.date })))
    .slice(0, 4)
    .map((e) => ({ e, d: g.deals.find((x) => x.id === e.id) }))
    .filter((x) => x.d);
  const name = (id: string) => companies.get(id)?.name.replace(/ \(.+\)$/, "") ?? id;
  const color = (id: string) => (companies.get(id) ? SECTOR_INFO[companies.get(id)!.sector].color : "#9b9b9b");

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <LegacyRedirect />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative -mt-16 overflow-hidden">
          <Image src={hero} alt="A night sky over a desert data center campus, with constellation lines connecting the stars like routes on an atlas" priority placeholder="blur" className="absolute inset-0 h-full w-full object-cover object-right" sizes="100vw" />
          <div className="relative mx-auto flex min-h-[640px] max-w-6xl flex-col justify-center px-4 pb-24 pt-32 md:min-h-[720px]">
            <p className="num text-sm text-muted">Updated every morning · {g.deals.length} deals · {g.companies.length} companies</p>
            <h1 className="hero-heading mt-4 max-w-[680px] text-4xl font-semibold sm:text-5xl md:text-6xl">
              Follow every dollar <br className="hidden sm:block" />
              moving through AI
            </h1>
            <p className="mt-6 max-w-[680px] text-lg text-fg/85">
              AI Atlas maps who pays whom across chips, clouds, data centers and power, from a $300 billion cloud contract to a single nuclear plant. Every deal links to the filing that proves it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Cta />
              <span className="flex items-center gap-2 text-sm text-muted">
                <SealCheck size={16} weight="fill" className="text-good" aria-hidden />
                {checks ? `${checks.verified} of ${checks.deals} quotes found on their live source page` : "Every quote checked against its source page"}
              </span>
            </div>
          </div>
        </section>

        {/* Proof strip */}
        <section aria-label="AI Atlas in numbers" className="border-y border-line bg-elev">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px md:grid-cols-5">
            {[
              [fmtUsd(totals.confirmed), "in confirmed deals"],
              [fmtUsd(totals.up_to), "more in \"up to\" deals, kept separate"],
              [String(loops.length), "circular deals found"],
              [String(dcs.length), "big US AI data centers"],
              [fmtMw(plannedMw), "of planned data center power"],
            ].map(([v, l]) => (
              <div key={l} className="px-4 py-6">
                <dt className="sr-only">{l}</dt>
                <dd className="num text-2xl text-fg">{v}</dd>
                <dd className="mt-1 text-sm text-muted">{l}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Tagline reveal */}
        <section className="px-4 py-24 text-center">
          <TaglineReveal lines={["Every line is a real deal,", "and every deal carries", "the sentence that proves it."]} />
        </section>

        {/* Problem to solution */}
        <Reveal className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-12 md:grid-cols-5 md:items-center">
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted">The problem</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Headlines say &ldquo;up to $100 billion.&rdquo; Filings say something else.</h2>
              <p className="mt-4 text-muted">
                AI money moves in giant, tangled deals, and the biggest numbers are often ceilings that never fully happen. AI Atlas keeps confirmed money and announced money apart, and when a deal
                changes, it keeps both versions so you can see what really happened.
              </p>
            </div>
            {v1 && v2 && (
              <div className="grid gap-4 sm:grid-cols-2 md:col-span-3">
                {[v1, v2].map((d, i) => (
                  <article key={d.id} className={`rounded-2xl border p-6 ${i === 0 ? "border-line bg-elev" : "border-line-strong bg-raised"}`}>
                    <div className="flex items-center justify-between text-sm text-muted">
                      <span>{fmtDate(d.date)}</span>
                      <span className={`num rounded border px-2 py-0.5 text-xs ${i === 0 ? "border-warn/30 text-warn" : "border-good/30 text-good"}`}>{i === 0 ? "Revised" : d.amount_kind === "confirmed" ? "Confirmed" : "Current"}</span>
                    </div>
                    <p className={`num mt-6 text-4xl ${i === 0 ? "text-muted line-through decoration-1" : "text-fg"}`}>{fmtDealAmount(d.amount_usd, d.amount_kind)}</p>
                    <p className="mt-2 text-sm">
                      <span style={{ color: color(d.from) }}>{name(d.from)}</span> <span className="text-dim">→</span> <span style={{ color: color(d.to) }}>{name(d.to)}</span>
                    </p>
                    <p className="mt-4 text-sm text-muted">&ldquo;{d.sources[0].quote}&rdquo;</p>
                    <a href={d.sources[0].url} className="mt-2 inline-block text-xs text-dim hover:text-fg" target="_blank" rel="noopener noreferrer">
                      {d.sources[0].publisher} ↗
                    </a>
                  </article>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Benefits, zig zag */}
        <section aria-labelledby="benefits" className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="benefits" className="sr-only">What you can do with AI Atlas</h2>
          {[
            {
              icon: Path,
              title: "See who pays whom in one picture",
              body: `${g.companies.length} companies, ${g.deals.length} deals. Dots are companies sized by revenue, lines are deals sized by dollars, and glowing particles travel the way the money moves. Drag the time slider to watch the web grow from 2019 to today.`,
              img: shotGraph,
              alt: "The Money Graph: companies as glowing dots clustered by sector, connected by lines for each deal",
              href: "/graph",
              link: "Open the graph",
            },
            {
              icon: ListMagnifyingGlass,
              title: "Answer \"who pays Nvidia the most?\" in seconds",
              body: "Click any company to see what it does, its money in and out, every deal with its source sentence, and a ranked list of who pays it. Public companies show their backlog and a live share price.",
              img: shotPanel,
              alt: "Nvidia's side panel listing revenue, money in and out, and its biggest payers",
              href: "/graph?c=nvidia",
              link: "See Nvidia's deals",
            },
            {
              icon: ArrowsClockwise,
              title: "Spot the circular deals",
              body: loop
                ? `The loop finder highlights money that comes back to where it started. ${name(loop.companies[0])} and ${name(loop.companies[1])} are the classic case: one invests in the other, which buys its chips. It finds ${loops.length} loops like this.`
                : `The loop finder highlights money that comes back to where it started. It finds ${loops.length} loops.`,
              img: shotLoops,
              alt: "CoreWeave selected in the graph, its deals with Nvidia, OpenAI, Microsoft and Meta highlighted",
              href: "/graph?loops=1",
              link: "Show all loops",
            },
            {
              icon: Eye,
              title: "Plain English with one switch",
              body: "Turn on Explain this and every company and deal gets a short plain English explanation, and jargon like HBM, PPA and backlog gets a definition when you hover it.",
              img: shotExplain,
              alt: "Oracle's panel with plain English explanations turned on",
              href: "/graph?c=oracle",
              link: "Try it on Oracle",
            },
          ].map((b, i) => (
            <Reveal key={b.title} className="grid items-center gap-8 py-12 md:grid-cols-12 md:gap-12">
              <div className={`md:col-span-5 ${i % 2 ? "md:order-2" : ""}`}>
                <b.icon size={24} weight="duotone" className="text-muted" aria-hidden />
                <h3 className="mt-4 text-2xl font-semibold tracking-tight">{b.title}</h3>
                <p className="mt-4 text-muted">{b.body}</p>
                <Link href={b.href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-fg hover:gap-3">
                  {b.link} <ArrowRight size={14} weight="bold" aria-hidden />
                </Link>
              </div>
              <div className={`md:col-span-7 ${i % 2 ? "md:order-1" : ""}`}>
                {/* Wide shots fill the column; tall panel shots sit centered like a phone screen. */}
                <div className={`overflow-hidden rounded-2xl border border-line bg-elev p-2 ${b.img.height > b.img.width ? "mx-auto max-w-sm" : ""}`}>
                  <Image src={b.img} alt={b.alt} className="h-auto w-full rounded-lg" sizes="(min-width: 768px) 640px, 100vw" />
                </div>
              </div>
            </Reveal>
          ))}
        </section>

        {/* Energy */}
        <Reveal className="mx-auto max-w-6xl px-4 py-16">
          <div className="overflow-hidden rounded-3xl border border-line bg-elev">
            <Image src={energyArt} alt="Night landscape: a nuclear plant's cooling towers feed power lines that run to a glowing data center campus" placeholder="blur" className="h-auto w-full" sizes="(min-width: 1152px) 1152px, 100vw" />
            <div className="grid gap-8 p-8 md:grid-cols-2 md:p-12">
              <div>
                <Lightning size={24} weight="duotone" className="text-muted" aria-hidden />
                <h2 className="mt-4 text-3xl font-semibold tracking-tight">The power behind the compute</h2>
                <p className="mt-4 text-muted">
                  The Energy Map shows {dcs.length} big US AI data centers, {plants.toLocaleString("en-US")} power plants over 50 MW, the nuclear and gas deals tech companies signed, today&apos;s grid fuel mix and what
                  electricity costs in every state.
                </p>
                <Link href="/energy" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-fg hover:gap-3">
                  Open the Energy Map <ArrowRight size={14} weight="bold" aria-hidden />
                </Link>
              </div>
              <dl className="grid grid-cols-2 gap-4 self-end">
                {[
                  [fmtMw(dcs.reduce((s, d) => s + d.power_mw_now, 0)), "used by tracked AI data centers today"],
                  [fmtMw(plannedMw), "when they're finished"],
                  [plants.toLocaleString("en-US"), "power plants on the map"],
                  ["Daily", "grid fuel mix from EIA"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-xl bg-raised p-4">
                    <dd className="num text-xl">{v}</dd>
                    <dt className="mt-1 text-sm text-muted">{l}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Reveal>

        {/* How it works */}
        <Reveal className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div className="overflow-hidden rounded-2xl border border-line">
              <Image src={sourcesArt} alt="A desk at night with financial filings, a magnifying glass and an open star atlas" placeholder="blur" className="h-auto w-full" sizes="(min-width: 768px) 560px, 100vw" />
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">How a deal gets on the map</h2>
              <ol className="mt-8 space-y-8">
                {[
                  [Stack, "Collected every morning", "New SEC filings from every tracked public company, company press releases and news are gathered at dawn."],
                  [CheckCircle, "Proved by code", "A program downloads each source and checks the quoted sentence is really there. Official sources that pass go live; everything else waits for a human."],
                  [Path, "Mapped and explained", "The deal becomes a line on the graph, with its amount, status, date, source and a plain English explanation."],
                ].map(([Icon, t, b], i) => {
                  const I = Icon as typeof Stack;
                  return (
                    <li key={t as string} className="flex gap-4">
                      <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raised text-sm text-muted">{i + 1}</span>
                      <div>
                        <h3 className="flex items-center gap-2 font-semibold">
                          <I size={16} weight="duotone" className="text-muted" aria-hidden /> {t as string}
                        </h3>
                        <p className="mt-1 text-muted">{b as string}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </Reveal>

        {/* What changed */}
        {recent.length > 0 && (
          <Reveal className="mx-auto max-w-6xl px-4 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-3xl font-semibold tracking-tight">Fresh this week</h2>
              <Link href="/changes" className="inline-flex items-center gap-2 text-sm font-semibold hover:gap-3">
                Everything that changed <ArrowRight size={14} weight="bold" aria-hidden />
              </Link>
            </div>
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {recent.map(({ e, d }) => (
                <li key={e.id} className="rounded-2xl border border-line bg-elev p-6">
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>{fmtDate(e.date)}</span>
                    <span>{e.via === "auto" ? "From an official source" : "Approved by a human"}</span>
                  </div>
                  <p className="mt-4 font-medium">{d!.title}</p>
                  <p className="num mt-2 text-sm text-muted">
                    <span style={{ color: color(d!.from) }}>{name(d!.from)}</span> → <span style={{ color: color(d!.to) }}>{name(d!.to)}</span> · {fmtDealAmount(d!.amount_usd, d!.amount_kind)}
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {/* FAQ: a side by side list, not an accordion */}
        <Reveal className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Questions</h2>
          <dl className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-2 text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* Risk reversal + final CTA */}
        <Reveal className="mx-auto max-w-6xl px-4 py-24 text-center">
          <h2 className="hero-heading mx-auto max-w-[680px] text-4xl font-semibold sm:text-5xl">
            Free to use.
            <br />
            No account, open data.
          </h2>
          <p className="mx-auto mt-6 max-w-[680px] text-muted">
            The data and code are on GitHub, and every number links to where it came from. Not investment advice.
          </p>
          <div className="mt-8 flex justify-center">
            <Cta />
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
