"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from "react-force-graph-2d";
import type { GraphCompany } from "@/lib/graph-data";
import { isSolid, lineWidth } from "@/lib/graph";
import type { Deal } from "@/lib/schema";
import { SECTOR_INFO } from "@/lib/sectors";

export type GNode = NodeObject & GraphCompany & { fx: number; fy: number };
/** One drawn line per payer -> payee pair; it carries every deal between them. */
export type GLink = LinkObject<GNode> & {
  key: string;
  from: string;
  to: string;
  deals: Deal[];
  amount: number;
  solid: boolean;
  curvature: number;
};

interface Props {
  companies: GraphCompany[];
  deals: Deal[];
  width: number;
  height: number;
  selected: string | null;
  /** company id -> hop distance; null = no highlighting */
  highlight: Map<string, number> | null;
  /** deal ids to emphasize (loop finder) */
  emphasizeDeals: Set<string> | null;
  onSelect: (id: string | null) => void;
  onHoverLink: (link: GLink | null, pos: { x: number; y: number } | null) => void;
  focusKey: string; // changes when the camera should re-fit
  compact?: boolean;
}

/** Canvas can't resolve CSS variables, so read the real (hashed) Inter family name once. */
let cachedFont = "";
function fontFamily() {
  if (!cachedFont && typeof document !== "undefined") cachedFont = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  return cachedFont || "system-ui, sans-serif";
}

function hexToRgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export default function GraphCanvas(p: Props) {
  const fg = useRef<ForceGraphMethods<GNode, GLink> | undefined>(undefined);
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const mouse = useRef({ x: 0, y: 0 });
  /** Label boxes drawn this frame, so a label that would collide with another is skipped. */
  const labelBoxes = useRef<[number, number, number, number][]>([]);

  const data = useMemo(() => {
    const nodes: GNode[] = p.companies
      .map((c) => ({ ...c, id: c.id, fx: c.x, fy: c.y, x: c.x, y: c.y }))
      // Most important first (by revenue and deal volume), so their labels win any collision.
      .sort((a, b) => a.rank - b.rank);
    const byPair = new Map<string, GLink>();
    for (const d of p.deals) {
      const key = `${d.from}>${d.to}`;
      let l = byPair.get(key);
      if (!l) {
        l = { key, source: d.from, target: d.to, from: d.from, to: d.to, deals: [], amount: 0, solid: false, curvature: 0 };
        byPair.set(key, l);
      }
      l.deals.push(d);
      l.amount += d.amount_usd ?? 0;
      l.solid ||= isSolid(d);
    }
    // Two-way money (e.g. Nvidia <-> CoreWeave) gets curved lines so both directions show.
    for (const l of byPair.values()) if (byPair.has(`${l.to}>${l.from}`)) l.curvature = 0.25;
    return { nodes, links: [...byPair.values()] };
  }, [p.companies, p.deals]);

  // Fit the camera when the visible set changes.
  useEffect(() => {
    const t = setTimeout(() => {
      const g = fg.current;
      if (!g) return;
      if (p.selected && p.highlight) {
        const ids = new Set(p.highlight.keys());
        g.zoomToFit(600, p.compact ? 30 : 90, (n) => ids.has(n.id as string));
      } else g.zoomToFit(600, p.compact ? 20 : 90);
    }, 60);
    return () => clearTimeout(t);
  }, [p.focusKey, p.selected, p.highlight, p.compact, p.width, p.height]);

  const dimNode = (id: string) => p.highlight !== null && !p.highlight.has(id);
  const linkActive = (l: GLink) => {
    if (p.emphasizeDeals) return l.deals.some((d) => p.emphasizeDeals!.has(d.id));
    if (!p.highlight) return true;
    const a = p.highlight.get(l.from);
    const b = p.highlight.get(l.to);
    return a !== undefined && b !== undefined && Math.abs(a - b) <= 1;
  };
  const sectorColor = (id: string) => {
    const n = data.nodes.find((x) => x.id === id);
    return n ? SECTOR_INFO[n.sector].color : "#888";
  };

  return (
    <div
      onMouseMove={(e) => {
        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      }}
    >
      <ForceGraph2D<GNode, GLink>
        ref={fg}
        graphData={data}
        width={p.width}
        height={p.height}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={0}
        warmupTicks={0}
        enableNodeDrag={false}
        minZoom={0.15}
        maxZoom={8}
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        nodeRelSize={1}
        nodeVal={(n) => n.r * n.r}
        nodeLabel={() => ""}
        linkLabel={() => ""}
        linkCurvature={(l) => l.curvature}
        linkWidth={(l) => (linkActive(l) ? lineWidth(l.amount || null) : 0.4)}
        linkLineDash={(l) => (l.solid ? null : [4, 3])}
        linkColor={(l) => {
          const c = sectorColor(l.from);
          return linkActive(l) ? hexToRgba(c, p.highlight || p.emphasizeDeals ? 0.75 : 0.32) : "rgba(120,130,150,0.06)";
        }}
        linkDirectionalParticles={(l) => (linkActive(l) ? Math.min(4, 1 + Math.floor(lineWidth(l.amount || null) / 1.5)) : 0)}
        linkDirectionalParticleWidth={(l) => Math.max(1.6, lineWidth(l.amount || null) * 0.9)}
        linkDirectionalParticleSpeed={() => 0.0045}
        linkDirectionalParticleColor={(l) => sectorColor(l.from)}
        onRenderFramePre={() => {
          labelBoxes.current = [];
        }}
        onNodeClick={(n) => p.onSelect(n.id as string)}
        onBackgroundClick={() => p.onSelect(null)}
        onNodeHover={(n) => {
          setHoverNode(n ? (n.id as string) : null);
          document.body.style.cursor = n ? "pointer" : "";
        }}
        onLinkHover={(l) => {
          document.body.style.cursor = l ? "pointer" : "";
          p.onHoverLink(l ?? null, l ? { ...mouse.current } : null);
        }}
        onLinkClick={(l) => p.onHoverLink(l, { ...mouse.current })}
        nodePointerAreaPaint={(n, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, n.r + 3, 0, 2 * Math.PI);
          ctx.fill();
        }}
        nodeCanvasObject={(n, ctx, scale) => {
          const color = SECTOR_INFO[n.sector].color;
          const dim = dimNode(n.id as string);
          const isSel = n.id === p.selected;
          const isHover = n.id === hoverNode;
          ctx.save();
          ctx.globalAlpha = dim ? 0.12 : 1;
          // glow
          if (!dim) {
            const g = ctx.createRadialGradient(n.x!, n.y!, n.r * 0.4, n.x!, n.y!, n.r * 2.6);
            g.addColorStop(0, hexToRgba(color, 0.35));
            g.addColorStop(1, hexToRgba(color, 0));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(n.x!, n.y!, n.r * 2.6, 0, 2 * Math.PI);
            ctx.fill();
          }
          ctx.fillStyle = hexToRgba(color, 0.9);
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, n.r, 0, 2 * Math.PI);
          ctx.fill();
          ctx.lineWidth = 1 / scale;
          ctx.strokeStyle = hexToRgba("#ffffff", 0.35);
          ctx.stroke();
          if (isSel || isHover) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2 / scale;
            ctx.beginPath();
            ctx.arc(n.x!, n.y!, n.r + 3 / scale + 1, 0, 2 * Math.PI);
            ctx.stroke();
          }
          // labels: big companies always, others when zoomed in or highlighted
          const showLabel = isSel || isHover || (!dim && (n.r >= 11 || scale > 1.6 || (p.highlight && p.highlight.has(n.id as string)) || n.rank <= 25));
          if (showLabel) {
            const fs = (isSel ? 13 : n.r >= 12 ? 12 : 10.5) / scale;
            ctx.font = `${isSel ? 600 : 500} ${fs}px ${fontFamily()}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = isSel ? "#ffffff" : "rgba(230,233,239,0.85)";
            ctx.shadowColor = "rgba(0,0,0,0.9)";
            ctx.shadowBlur = 4;
            const label = n.name.replace(/ \(.+\)$/, "");
            const w = ctx.measureText(label).width;
            const top = n.y! + n.r + 2 / scale;
            const pad = 3 / scale;
            const box: [number, number, number, number] = [n.x! - w / 2 - pad, top - pad, n.x! + w / 2 + pad, top + fs + pad];
            const hit = labelBoxes.current.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
            if (!hit || isSel || isHover) {
              labelBoxes.current.push(box);
              ctx.fillText(label, n.x!, top);
            }
          }
          ctx.restore();
        }}
      />
    </div>
  );
}
