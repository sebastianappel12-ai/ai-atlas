import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Privacy and terms",
  description: "What AI Atlas collects (almost nothing), how the data may be reused, and why nothing here is investment advice.",
};

export default function PrivacyPage() {
  return (
    <>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 leading-relaxed max-md:mt-9 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_p]:text-fg/85">
        <h1 className="hero-heading text-4xl font-semibold">Privacy and terms</h1>
        <p>Last updated October 26, 2026.</p>

        <h2>Privacy</h2>
        <p>
          AI Atlas has no accounts and sets no cookies. Page visits are counted with Vercel Web Analytics, which records anonymous, aggregated page views without cookies
          or personal identifiers. Your Explain mode setting and whether you have seen the guided tour are stored only in your own browser.
        </p>
        <p>
          Error reports go to GitHub, under GitHub&apos;s own privacy policy. The share price charts are TradingView widgets, which load from TradingView and follow its
          privacy policy.
        </p>

        <h2>Terms of use</h2>
        <p>
          <strong className="font-medium">Not investment advice.</strong> AI Atlas is a reference tool. Nothing on it is a recommendation to buy, sell or hold anything.
          Figures can be wrong, estimated or out of date; always check the linked source before relying on one.
        </p>
        <p>
          The code and our compiled deal data are open on{" "}
          <a className="underline" href="https://github.com/sebastianappel12-ai/ai-atlas">GitHub</a>. Data from others keeps its own license: Epoch AI&apos;s data center data is
          CC-BY (credit Epoch AI), EIA and SEC data are public domain, and quotes from news articles are short excerpts that link to the original.
        </p>
        <p>
          Found a mistake? Use &ldquo;Report an error&rdquo; on any deal, or read the <Link className="underline" href="/methodology">methodology</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
