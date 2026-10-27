import { ImageResponse } from "next/og";
import { readGraph } from "@/lib/data-server";
import { SECTOR_INFO } from "@/lib/sectors";

export const alt = "AI Atlas: a map of how money moves through the AI industry";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link preview: the actual graph, drawn small, with the headline numbers. */
export default async function Image() {
  const g = readGraph();
  const shown = g.companies.filter((c) => c.rank <= 70);
  const ids = new Set(shown.map((c) => c.id));
  const xs = shown.map((c) => c.x);
  const ys = shown.map((c) => c.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const W = 560;
  const H = 560;
  const px = (x: number) => 20 + ((x - minX) / (maxX - minX || 1)) * (W - 40);
  const py = (y: number) => 20 + ((y - minY) / (maxY - minY || 1)) * (H - 40);
  const pos = new Map(shown.map((c) => [c.id, { x: px(c.x), y: py(c.y), color: SECTOR_INFO[c.sector].color, r: Math.max(3, c.r * 0.55) }]));
  const lines = g.deals.filter((d) => ids.has(d.from) && ids.has(d.to) && d.status !== "revised").slice(-260);
  const confirmed = g.deals.filter((d) => d.amount_kind === "confirmed" && d.status !== "revised" && d.status !== "canceled").reduce((s, d) => s + (d.amount_usd ?? 0), 0);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#000000", color: "#ededed", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 64px", width: 600 }}>
          <div style={{ fontSize: 22, letterSpacing: 6, color: "#9b9b9b" }}>AI ATLAS</div>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, marginTop: 16 }}>How money and power move through AI</div>
          <div style={{ fontSize: 26, color: "#9b9b9b", marginTop: 24, display: "flex" }}>
            {g.companies.length} companies · {g.deals.length} deals · every one sourced
          </div>
          <div style={{ fontSize: 26, color: "#9b9b9b", marginTop: 8, display: "flex" }}>${Math.round(confirmed / 1e9).toLocaleString("en-US")}B in confirmed deals</div>
        </div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 35 }}>
          {lines.map((d) => {
            const a = pos.get(d.from)!;
            const b = pos.get(d.to)!;
            return <line key={d.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={a.color} strokeOpacity={0.35} strokeWidth={1.2} strokeDasharray={d.amount_kind === "confirmed" ? undefined : "4 3"} />;
          })}
          {[...pos.values()].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.color} fillOpacity={0.9} />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
