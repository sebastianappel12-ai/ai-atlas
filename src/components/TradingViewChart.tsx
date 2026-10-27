"use client";

import { useEffect, useRef } from "react";

/** TradingView's free mini chart widget — built for public sites, so its terms allow showing prices. */
export function TradingViewChart({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || symbol.startsWith("SAMPLE:")) return;
    el.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    s.async = true;
    s.innerHTML = JSON.stringify({
      symbol,
      width: "100%",
      height: 180,
      locale: "en",
      dateRange: "12M",
      colorTheme: "dark",
      isTransparent: true,
      autosize: false,
      largeChartUrl: "",
      chartOnly: false,
      noTimeScale: false,
    });
    el.appendChild(s);
    return () => {
      el.innerHTML = "";
    };
  }, [symbol]);
  if (symbol.startsWith("SAMPLE:")) return <div className="text-xs text-dim">Sample company — no price chart.</div>;
  return <div ref={ref} className="tradingview-widget-container h-[180px] overflow-hidden rounded-lg" />;
}
