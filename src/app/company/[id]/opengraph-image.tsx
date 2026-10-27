import { ImageResponse } from "next/og";
import { readGraph } from "@/lib/data-server";
import { fmtUsd } from "@/lib/format";
import { sumDeals } from "@/lib/graph";
import { SECTOR_INFO } from "@/lib/sectors";

export const alt = "Company deals on AI Atlas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return readGraph().companies.map((c) => ({ id: c.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = readGraph();
  const c = g.companies.find((x) => x.id === id)!;
  const info = SECTOR_INFO[c.sector];
  const inT = sumDeals(g.deals.filter((d) => d.to === id));
  const outT = sumDeals(g.deals.filter((d) => d.from === id));
  const Box = ({ label, t }: { label: string; t: ReturnType<typeof sumDeals> }) => (
    <div style={{ display: "flex", flexDirection: "column", border: "1px solid #283041", borderRadius: 18, padding: "24px 32px", width: 440 }}>
      <div style={{ fontSize: 26, color: "#8b93a4" }}>{`${label} · ${t.count} deals`}</div>
      <div style={{ fontSize: 60, fontWeight: 700, marginTop: 6 }}>{fmtUsd(t.confirmed)}</div>
      <div style={{ fontSize: 22, color: "#8b93a4" }}>{`confirmed${t.up_to ? ` + ${fmtUsd(t.up_to)} up to` : ""}${t.estimated ? ` + ${fmtUsd(t.estimated)} est.` : ""}`}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#05070b", color: "#e6e9ef", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 22, letterSpacing: 6, color: "#8b93a4" }}>AI ATLAS</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 28 }}>
          <div style={{ width: 34, height: 34, borderRadius: 17, background: info.color, boxShadow: `0 0 30px ${info.color}`, marginRight: 22 }} />
          <div style={{ fontSize: 72, fontWeight: 700 }}>{c.name}</div>
        </div>
        <div style={{ fontSize: 28, color: info.color, marginTop: 8 }}>{info.label}</div>
        <div style={{ display: "flex", gap: 32, marginTop: 56 }}>
          <Box label="Money in" t={inT} />
          <Box label="Money out" t={outT} />
        </div>
      </div>
    ),
    size,
  );
}
