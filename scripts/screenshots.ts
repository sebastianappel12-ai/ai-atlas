/**
 * Let the agent see its own work: screenshot key pages with Playwright.
 *   npm run screenshots                       # against http://localhost:3000
 *   BASE_URL=https://... npm run screenshots  # against a deploy
 * Writes PNGs to screenshots/ and prints console errors and graph load time.
 */
import { chromium, type Page } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const only = process.argv.slice(2);
fs.mkdirSync("screenshots", { recursive: true });

interface Shot { name: string; path: string; width?: number; height?: number; mobile?: boolean; before?: (p: Page) => Promise<void>; wait?: number }
const SHOTS: Shot[] = [
  { name: "graph", path: "/", wait: 2500, before: async (p) => p.evaluate(() => localStorage.setItem("toured", "1")) },
  { name: "graph-nvidia", path: "/?c=nvidia", wait: 3000 },
  { name: "graph-loops", path: "/?loops=1", wait: 2500 },
  { name: "graph-2021", path: "/?t=2021-06-28", wait: 2500 },
  { name: "tour", path: "/", wait: 2000, before: async (p) => p.evaluate(() => localStorage.removeItem("toured")) },
  { name: "explain", path: "/?c=coreweave", wait: 3000, before: async (p) => p.evaluate(() => (localStorage.setItem("explain", "1"), localStorage.setItem("toured", "1"))) },
  { name: "mobile-list", path: "/", mobile: true, wait: 1500 },
  { name: "mobile-company", path: "/?c=openai", mobile: true, wait: 2000 },
  { name: "company-page", path: "/company/nvidia", wait: 1500 },
  { name: "energy", path: "/energy", wait: 5000 },
  { name: "energy-owner", path: "/energy?owner=meta", wait: 5000 },
  { name: "energy-grid", path: "/energy?layers=datacenters,grid&dc=openai-stargate-abilene", wait: 6000 },
  { name: "energy-prices", path: "/energy?layers=prices,datacenters", wait: 6000 },
  { name: "energy-mobile", path: "/energy", mobile: true, wait: 5000 },
  { name: "changes", path: "/changes", wait: 1000 },
  { name: "methodology", path: "/methodology", wait: 1000 },
];

const browser = await chromium.launch();
for (const s of SHOTS.filter((x) => !only.length || only.includes(x.name))) {
  const ctx = await browser.newContext(
    s.mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: s.width ?? 1440, height: s.height ?? 900 } },
  );
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  // Vercel Analytics' script only exists on Vercel deployments; ignore its 404 locally.
  page.on("response", (r) => r.status() >= 400 && !r.url().includes("/_vercel/") && errors.push(`HTTP ${r.status()} ${r.url()}`));
  if (s.before) {
    await page.goto(BASE + "/methodology").catch(() => {});
    await s.before(page);
  }
  const t0 = Date.now();
  const res = await page.goto(BASE + s.path, { waitUntil: "load" });
  if (!s.mobile && (s.path === "/" || s.path.startsWith("/?"))) await page.waitForSelector("canvas", { timeout: 15000 }).catch(() => errors.push("no canvas"));
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(s.wait ?? 1000);
  await page.screenshot({ path: `screenshots/${s.name}.png` });
  console.log(`${s.name.padEnd(16)} HTTP ${res?.status()}  ready ${loadMs} ms${errors.length ? "  ERRORS: " + errors.slice(0, 3).join(" | ") : ""}`);
  await ctx.close();
}
await browser.close();
