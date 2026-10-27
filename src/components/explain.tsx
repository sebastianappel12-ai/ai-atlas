"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { GLOSSARY, GLOSSARY_TERMS } from "@/lib/glossary";

const ExplainCtx = createContext<{ on: boolean; set: (v: boolean) => void }>({ on: false, set: () => {} });

/** Explain mode lives in localStorage so it survives page changes; this is a tiny store around it. */
const listeners = new Set<() => void>();
let memory = false; // fallback when storage is blocked
function readExplain() {
  try {
    return localStorage.getItem("explain") === "1";
  } catch {
    return memory;
  }
}
function writeExplain(v: boolean) {
  memory = v;
  try {
    localStorage.setItem("explain", v ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function ExplainProvider({ children }: { children: ReactNode }) {
  const on = useSyncExternalStore(subscribe, readExplain, () => false);
  const set = writeExplain;
  return <ExplainCtx.Provider value={{ on, set }}>{children}</ExplainCtx.Provider>;
}

export const useExplain = () => useContext(ExplainCtx);

export function ExplainToggle() {
  const { on, set } = useExplain();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => set(!on)}
      className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:border-line-strong hover:text-fg"
      title="Turn on plain-English explanations"
      data-tour="explain"
    >
      <span className={`relative h-4 w-7 rounded-full transition ${on ? "bg-white/90" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full transition-all ${on ? "left-3.5 bg-black" : "left-0.5 bg-white/70"}`} />
      </span>
      Explain this
    </button>
  );
}

/** A jargon word that shows its definition on hover when Explain mode is on. */
export function Term({ t, children }: { t: string; children?: ReactNode }) {
  const { on } = useExplain();
  const key = GLOSSARY_TERMS.find((k) => k.toLowerCase() === t.toLowerCase());
  if (!on || !key) return <>{children ?? t}</>;
  return (
    <span className="term group relative">
      {children ?? t}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-line-strong bg-elev p-3 text-left text-xs font-normal leading-relaxed text-fg shadow-xl group-hover:block">
        <span className="mb-1 block font-semibold">{key}</span>
        {GLOSSARY[key]}
      </span>
    </span>
  );
}

const TERM_RE = new RegExp(`\\b(${GLOSSARY_TERMS.filter((t) => t.length > 2).sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")).join("|")})\\b`, "gi");

/** Wrap every glossary word in a string with <Term> (no-op when Explain mode is off). */
export function WithTerms({ text }: { text: string }) {
  const { on } = useExplain();
  if (!on) return <>{text}</>;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TERM_RE)) {
    parts.push(text.slice(last, m.index));
    parts.push(<Term key={m.index} t={m[0]}>{m[0]}</Term>);
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

/** A plain-English box that only appears in Explain mode. */
export function ExplainBox({ children }: { children: ReactNode }) {
  const { on } = useExplain();
  if (!on) return null;
  return (
    <div className="rounded-lg border border-white/15 bg-white/[0.04] p-3 text-sm leading-relaxed text-fg">
      <div className="num mb-1 text-[10px] uppercase tracking-[0.2em] text-muted">In plain English</div>
      {children}
    </div>
  );
}
