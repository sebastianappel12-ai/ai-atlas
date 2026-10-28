"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ExplainToggle } from "./explain";

const NAV = [
  { href: "/graph", label: "Money Graph" },
  { href: "/energy", label: "Energy Map" },
  { href: "/changes", label: "What changed" },
  { href: "/methodology", label: "Methodology" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

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

/** Two lines that rotate into an X: the toggle transforms instead of swapping icons. */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-4 w-5" aria-hidden>
      <span
        className="absolute left-0 top-1 block h-0.5 w-5 rounded bg-fg transition-transform duration-500 ease-base"
        style={{ transform: open ? "translateY(4px) rotate(45deg)" : "none" }}
      />
      <span
        className="absolute bottom-1 left-0 block h-0.5 w-5 rounded bg-fg transition-transform duration-500 ease-base"
        style={{ transform: open ? "translateY(-4px) rotate(-45deg)" : "none" }}
      />
    </span>
  );
}

/** A compact nav that floats off the top edge on a translucent, blurred surface. */
export function SiteHeader() {
  const path = usePathname();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const active = (href: string) => path.startsWith(href);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="relative z-40 h-16 shrink-0 px-2 pt-2">
      <nav aria-label="Main" className="panel mx-auto flex h-12 max-w-screen-2xl items-center gap-4 rounded-xl px-3">
        <Link href="/" className="flex items-center gap-2 rounded-md" onClick={() => setOpen(false)}>
          <Logo />
          <span className="text-sm font-semibold tracking-tight">AI Atlas</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm ${active(n.href) ? "bg-white/10 font-medium text-fg" : "text-muted hover:bg-white/5 hover:text-fg"}`}
            >
              {n.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {path === "/graph" && (
            <button onClick={() => window.dispatchEvent(new Event("atlas:tour"))} className="hidden rounded-md px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-fg sm:block">
              Tour
            </button>
          )}
          {path === "/" ? (
            <Link href="/graph" className="hidden rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90 sm:block">
              Open the Money Graph
            </Link>
          ) : (
            <ExplainToggle />
          )}
          <button
            onClick={() => setOpen(!open)}
            className="rounded-md p-2 hover:bg-white/5 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </nav>

      {/* Phones: a full height panel; links arrive one after another in reading order. */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/90 px-4 pt-6 backdrop-blur-xl md:hidden"
          >
            <ul className="space-y-1">
              {[{ href: "/", label: "Home" }, ...NAV].map((n, i) => (
                <motion.li
                  key={n.href}
                  initial={{ opacity: 0, y: reduce ? 0 : 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.06, 0.4) }}
                >
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    aria-current={(n.href === "/" ? path === "/" : active(n.href)) ? "page" : undefined}
                    className="block rounded-xl px-3 py-3 text-2xl font-semibold tracking-tight text-fg aria-[current=page]:bg-white/10"
                  >
                    {n.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
            <div className="mt-8 px-3">
              <ExplainToggle />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line px-4 py-12 text-sm text-dim">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2">
        <div>
          <Link href="/" className="flex items-center gap-2 text-fg">
            <Logo />
            <span className="font-semibold tracking-tight">AI Atlas</span>
          </Link>
          <p className="mt-3 max-w-sm">
            For information only, <strong className="font-medium text-muted">not investment advice</strong>. Every deal links to the source that proves it.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <span className="flex flex-wrap gap-x-4 gap-y-2">
            <Link className="hover:text-fg" href="/graph">Money Graph</Link>
            <Link className="hover:text-fg" href="/energy">Energy Map</Link>
            <Link className="hover:text-fg" href="/methodology">Methodology</Link>
            <Link className="hover:text-fg" href="/privacy">Privacy and terms</Link>
            <a className="hover:text-fg" href="https://github.com/sebastianappel12-ai/ai-atlas">GitHub</a>
          </span>
          <span>
            Data centers: <a className="underline hover:text-fg" href="https://epoch.ai/data/data-centers">Epoch AI</a> (CC-BY) · Power: U.S. EIA · Filings: SEC EDGAR
          </span>
        </div>
      </div>
    </footer>
  );
}
