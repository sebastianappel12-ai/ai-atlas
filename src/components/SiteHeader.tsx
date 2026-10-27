"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExplainToggle } from "./explain";

const NAV = [
  { href: "/", label: "Money Graph" },
  { href: "/energy", label: "Energy Map" },
  { href: "/changes", label: "What changed" },
  { href: "/methodology", label: "Methodology" },
];

export function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 7 L18 6 L15 18 Z" fill="none" stroke="white" strokeOpacity=".45" strokeWidth="1" />
      <circle cx="6" cy="7" r="2.6" fill="#a98be8" />
      <circle cx="18" cy="6" r="2" fill="#48c987" />
      <circle cx="15" cy="18" r="3" fill="#5b9bf0" />
    </svg>
  );
}

/** A nav that floats just off the top edge on a translucent surface. */
export function SiteHeader() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <header className="relative z-30 h-16 shrink-0 px-2 pt-2">
      <nav aria-label="Main" className="panel flex h-12 items-center gap-4 rounded-xl px-3">
        <Link href="/" className="flex items-center gap-2 rounded-md">
          <Logo />
          <span className="text-sm font-semibold tracking-tight">AI Atlas</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm ${active(n.href) ? "bg-white/10 font-medium text-fg" : "text-muted hover:bg-white/5 hover:text-fg"}`}
            >
              {n.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {path === "/" && (
            <button onClick={() => window.dispatchEvent(new Event("atlas:tour"))} className="hidden rounded-md px-3 py-1.5 text-sm text-muted hover:bg-white/5 hover:text-fg sm:block">
              Tour
            </button>
          )}
          <ExplainToggle />
        </div>
      </nav>
      <div className="absolute left-0 right-0 top-16 flex gap-1 overflow-x-auto px-2 py-1 md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active(n.href) ? "page" : undefined}
            className={`shrink-0 rounded-md px-3 py-1 text-sm ${active(n.href) ? "bg-white/10 text-fg" : "text-muted"}`}
          >
            {n.label}
          </Link>
        ))}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line px-4 py-8 text-sm text-dim">
      <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-4">
        <span>
          AI Atlas is for information only and is <strong className="font-medium text-muted">not investment advice</strong>.
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <span>
            Data centers: <a className="underline hover:text-fg" href="https://epoch.ai/data/data-centers">Epoch AI</a> (CC-BY) · Power: U.S. EIA · Filings: SEC EDGAR
          </span>
          <Link className="underline hover:text-fg" href="/methodology">Methodology</Link>
          <Link className="underline hover:text-fg" href="/privacy">Privacy and terms</Link>
        </span>
      </div>
    </footer>
  );
}
