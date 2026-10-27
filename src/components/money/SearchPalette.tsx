"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphCompany } from "@/lib/graph-data";
import { SECTOR_INFO } from "@/lib/sectors";

export function matchCompanies(companies: GraphCompany[], q: string): GraphCompany[] {
  const s = q.trim().toLowerCase();
  if (!s) return [...companies].sort((a, b) => a.rank - b.rank).slice(0, 8);
  const score = (c: GraphCompany) => {
    const names = [c.name, c.id, c.ticker?.split(":")[1] ?? "", ...c.aliases].map((x) => x.toLowerCase());
    if (names.some((n) => n === s)) return 0;
    if (names.some((n) => n.startsWith(s))) return 1;
    if (names.some((n) => n.includes(s))) return 2;
    return 9;
  };
  return companies
    .map((c) => [c, score(c)] as const)
    .filter(([, sc]) => sc < 9)
    .sort((a, b) => a[1] - b[1] || a[0].rank - b[0].rank)
    .slice(0, 8)
    .map(([c]) => c);
}

/** Search any company with "/" or Cmd/Ctrl+K. */
export function SearchPalette({ companies, onPick }: { companies: GraphCompany[]; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => matchCompanies(companies, q), [companies, q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);

  const pick = (id: string) => {
    onPick(id);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:border-line-strong hover:text-fg"
        data-tour="search"
      >
        <Search size={13} /> <span className="hidden sm:inline">Search companies</span>
        <kbd className="num hidden rounded border border-line px-1 text-[10px] text-dim sm:inline">/</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="panel w-full max-w-lg overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search companies">
            <div className="flex items-center gap-2 border-b border-line px-4">
              <Search size={16} className="text-muted" />
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setI(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") (e.preventDefault(), setI((x) => Math.min(results.length - 1, x + 1)));
                  if (e.key === "ArrowUp") (e.preventDefault(), setI((x) => Math.max(0, x - 1)));
                  if (e.key === "Enter" && results[i]) pick(results[i].id);
                }}
                placeholder="Nvidia, OpenAI, NVDA…"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-dim"
                aria-label="Company name or ticker"
              />
              <kbd className="num rounded border border-line px-1.5 text-[10px] text-dim">esc</kbd>
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {results.map((c, k) => (
                <li key={c.id}>
                  <button
                    onMouseEnter={() => setI(k)}
                    onClick={() => pick(c.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${k === i ? "bg-white/10" : ""}`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: SECTOR_INFO[c.sector].color }} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="num text-xs text-dim">{c.ticker?.split(":")[1] ?? SECTOR_INFO[c.sector].short}</span>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="px-3 py-4 text-sm text-dim">No company matches “{q}”.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
