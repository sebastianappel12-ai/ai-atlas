"use client";

import { useEffect } from "react";

/** Share links made before the landing page existed (/?c=nvidia) now live at /graph. */
const GRAPH_PARAMS = ["c", "h", "types", "min", "cert", "nocancel", "t", "loops", "all", "hide"];

export function LegacyRedirect() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (GRAPH_PARAMS.some((k) => p.has(k))) window.location.replace(`/graph?${p}`);
  }, []);
  return null;
}
