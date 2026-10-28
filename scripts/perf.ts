/**
 * Phone load test: mid-range phone CPU (4x slowdown) on a fast 4G connection.
 *   BASE_URL=https://... npx tsx scripts/perf.ts
 * Reports when each page's main content is usable (the plan's target: under 2 s on a phone).
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PAGES: [string, string][] = [
  ["/", "h1"],
  ["/graph", "text=Companies"],
  ["/graph?c=nvidia", "text=Who pays Nvidia the most"],
  ["/energy", "canvas.maplibregl-canvas"],
  ["/company/nvidia", "h1"],
  ["/methodology", "h1"],
];

const browser = await chromium.launch();
for (const [path, ready] of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
  const t0 = Date.now();
  await page.goto(BASE + path, { waitUntil: "commit" });
  await page.waitForSelector(ready, { timeout: 20000 });
  const usable = Date.now() - t0;
  const lcp = await page.evaluate(
    () => new Promise<number>((res) => {
      new PerformanceObserver((l) => res(l.getEntries().at(-1)!.startTime)).observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => res(-1), 1500);
    }),
  );
  console.log(`${path.padEnd(18)} usable ${String(usable).padStart(5)} ms   LCP ${lcp < 0 ? "n/a" : Math.round(lcp) + " ms"}   ${usable < 2000 ? "OK" : "SLOW"}`);
  await ctx.close();
}
await browser.close();
