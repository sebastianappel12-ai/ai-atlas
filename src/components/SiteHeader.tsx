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

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-4 border-b border-line bg-bg/80 px-4 backdrop-blur">
      <Link href="/" className="flex items-center gap-2">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <circle cx="6" cy="7" r="2.6" fill="#b794f6" />
          <circle cx="18" cy="6" r="2" fill="#3ddc84" />
          <circle cx="15" cy="18" r="3" fill="#4f9cff" />
          <path d="M6 7 L18 6 L15 18 Z" fill="none" stroke="white" strokeOpacity=".5" strokeWidth="1" />
        </svg>
        <span className="text-sm font-semibold tracking-tight">AI Atlas</span>
      </Link>
      <nav className="hidden items-center gap-1 md:flex">
        {NAV.map((n) => {
          const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={`rounded-md px-2.5 py-1.5 text-xs transition ${on ? "bg-white/10 text-fg" : "text-muted hover:text-fg"}`}>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {path === "/" && (
          <button onClick={() => window.dispatchEvent(new Event("atlas:tour"))} className="hidden rounded-full px-3 py-1.5 text-xs text-muted hover:text-fg sm:block">
            Tour
          </button>
        )}
        <ExplainToggle />
      </div>
      <nav className="absolute left-0 right-0 top-14 flex gap-1 overflow-x-auto border-b border-line bg-bg px-2 py-1 md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`shrink-0 rounded-md px-2.5 py-1 text-xs ${path === n.href ? "bg-white/10" : "text-muted"}`}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line px-4 py-6 text-xs text-dim">
      <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3">
        <span>AI Atlas is for information only and is <strong className="text-muted">not investment advice</strong>.</span>
        <span>
          Data center data: <a className="underline hover:text-fg" href="https://epoch.ai/data/data-centers">Epoch AI</a> (CC-BY) · Power data: U.S. EIA · Filings: SEC EDGAR ·{" "}
          <Link className="underline hover:text-fg" href="/methodology">Methodology</Link>
        </span>
      </div>
    </footer>
  );
}
