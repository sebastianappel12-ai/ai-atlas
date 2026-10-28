/**
 * Capture real product screenshots for the landing page (public/art/shot-*.webp).
 *   BASE_URL=https://ai-atlas-pearl.vercel.app npx tsx scripts/capture-art.ts
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// Where the Money Graph lives on BASE (older deploys served it at "/").
const G = process.env.GRAPH_PATH ?? "/graph";
const SHOTS: { name: string; path: string; wait: number; explain?: boolean; clip?: { x: number; y: number; width: number; height: number } }[] = [
  { name: "shot-graph", path: `${G}`, wait: 3500, clip: { x: 500, y: 64, width: 780, height: 420 } },
  { name: "shot-panel", path: `${G}?c=nvidia`, wait: 4000, clip: { x: 1016, y: 72, width: 424, height: 828 } },
  { name: "shot-loops", path: `${G}?c=coreweave&h=1`, wait: 4000 },
  { name: "shot-explain", path: `${G}?c=oracle`, wait: 4000, explain: true, clip: { x: 1016, y: 72, width: 424, height: 640 } },
  { name: "shot-energy", path: "/energy?layers=datacenters,plants,deals", wait: 6000 },
];

fs.mkdirSync("public/art", { recursive: true });
const browser = await chromium.launch();
for (const s of SHOTS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/privacy");
  await page.evaluate((ex) => {
    localStorage.setItem("toured", "1");
    localStorage.setItem("explain", ex ? "1" : "0");
  }, Boolean(s.explain));
  await page.goto(BASE + s.path, { waitUntil: "load" });
  await page.waitForTimeout(s.wait);
  const png = await page.screenshot({ clip: s.clip });
  fs.writeFileSync(`public/art/${s.name}.png`, png);
  console.log(`captured ${s.name}`);
  await ctx.close();
}
await browser.close();
