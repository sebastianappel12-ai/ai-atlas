import { SECTOR_INFO, SECTOR_ORDER } from "@/lib/sectors";

// Phase 0 sample page: shows the design basics (sector colors, fonts, dark theme).
export default function Home() {
  return (
    <main className="starfield min-h-screen px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <p className="num text-xs uppercase tracking-[0.3em] text-muted">AI Atlas · Phase 0</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">How money and power move through AI</h1>
        <p className="mt-3 max-w-2xl text-muted">
          A map of the AI industry: every dot a company, every line a deal, every deal with a source link and a date.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {SECTOR_ORDER.map((s) => {
            const info = SECTOR_INFO[s];
            return (
              <div key={s} className="panel flex items-center gap-4 rounded-xl p-4">
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ background: info.color, boxShadow: `0 0 14px ${info.color}` }}
                />
                <div className="min-w-0">
                  <div className="font-medium" style={{ color: info.color }}>
                    {info.label}
                  </div>
                  <div className="truncate text-sm text-muted">{info.examples}</div>
                </div>
                <span className="num ml-auto text-xs text-dim">{info.color}</span>
              </div>
            );
          })}
        </div>
        <p className="num mt-10 text-sm text-dim">$300,000,000,000 · 2,176 MW · 0123456789</p>
      </div>
    </main>
  );
}
