"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useExplain } from "@/components/explain";

const STEPS = [
  { title: "Welcome to AI Atlas", body: "This is a map of the money in AI. Every dot is a company and every line is a deal. The glowing particles travel in the direction the money moves.", at: null },
  { title: "Colors are sectors", body: "Purple dots are AI labs, blue are cloud giants, green are chip designers, yellow are power companies, and so on. Click a sector to hide or show it.", at: "legend" },
  { title: "Solid vs. dashed", body: "A solid line is money confirmed in filings. A dashed line is an announced or \"up to\" amount that hasn't fully happened. We never add the two together.", at: "legend" },
  { title: "Click any company", body: "Click a dot to see what the company does, who pays it the most, and every deal with a link to its source. Press / to search.", at: "search" },
  { title: "Tools", body: "Loops finds circular deals, where money comes back to where it started. Steps follows the money 1, 2 or 3 hops out. Share copies a link to exactly what you see.", at: "tools" },
  { title: "Travel through time", body: "Press play to watch the web grow from 2019 to today, or drag the slider.", at: "time" },
  { title: "Explain this", body: "Turn this on and every panel gets a plain-English explanation, and jargon like HBM or PPA shows a definition when you hover it.", at: "explain" },
];

/** A 60-second guided tour for first-time visitors (and anyone who clicks "Tour"). */
export function GuidedTour() {
  const [step, setStep] = useState<number | null>(() => {
    try {
      return localStorage.getItem("toured") ? null : 0;
    } catch {
      return null;
    }
  });
  const { set: setExplain } = useExplain();

  useEffect(() => {
    const start = () => setStep(0);
    window.addEventListener("atlas:tour", start);
    return () => window.removeEventListener("atlas:tour", start);
  }, []);

  const done = () => {
    setStep(null);
    try {
      localStorage.setItem("toured", "1");
    } catch {}
  };

  const s = step === null ? null : STEPS[step];
  const target = s?.at ? document.querySelector(`[data-tour="${s.at}"]`)?.getBoundingClientRect() : null;
  const pos = target
    ? { left: Math.min(Math.max(16, target.left), window.innerWidth - 360), top: target.bottom + 12 > window.innerHeight - 200 ? target.top - 200 : target.bottom + 12 }
    : { left: window.innerWidth / 2 - 170, top: window.innerHeight / 2 - 100 };

  return (
    <AnimatePresence>
      {s && (
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="panel fixed z-50 w-[340px] rounded-2xl p-5 shadow-2xl"
          style={pos}
          role="dialog"
          aria-label="Guided tour"
        >
          <div className="num text-[10px] uppercase tracking-[0.2em] text-muted">
            Tour · {step! + 1} / {STEPS.length}
          </div>
          <h3 className="mt-1 text-base font-semibold">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-fg/85">{s.body}</p>
          <div className="mt-4 flex items-center justify-between">
            <button onClick={done} className="text-xs text-muted hover:text-fg">
              Skip
            </button>
            <div className="flex gap-2">
              {step === STEPS.length - 1 && (
                <button
                  onClick={() => {
                    setExplain(true);
                    done();
                  }}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-line-strong"
                >
                  Turn on Explain
                </button>
              )}
              <button onClick={() => (step! < STEPS.length - 1 ? setStep(step! + 1) : done())} className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black">
                {step! < STEPS.length - 1 ? "Next" : "Done"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
