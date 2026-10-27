/**
 * Weekly re-check of older deals still marked "announced": is the source still up and does
 * the quote still appear? Passing deals get a fresh last_checked; failures open a GitHub issue
 * (never auto-delete). Logs "rechecked" entries for the What changed page.
 *   npx tsx scripts/recheck.ts [--days 7] [--dry-run]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readJsonDir, ROOT, writeJson } from "../src/lib/data-fs";
import { checkQuote } from "../src/lib/quote";
import { ChangelogSchema, type Changelog, type Deal } from "../src/lib/schema";

const args = process.argv.slice(2);
const days = Number(args.includes("--days") ? args[args.indexOf("--days") + 1] : 7);
const dryRun = args.includes("--dry-run");
const today = new Date().toISOString().slice(0, 10);
const cutoff = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);

const dir = path.join(ROOT, "data/deals");
const due = readJsonDir(dir)
  .map((r) => r.data as Deal)
  .filter((d) => d.status === "announced" && d.last_checked <= cutoff);

const failed: { deal: Deal; why: string }[] = [];
let ok = 0;
for (const d of due) {
  let found = false;
  const notes: string[] = [];
  for (const s of d.sources) {
    const r = await checkQuote(s.url, s.quote);
    notes.push(`${s.url}: ${r.status}${r.http ? ` (${r.http})` : ""}`);
    if (r.status === "found") {
      found = true;
      break;
    }
    await new Promise((res) => setTimeout(res, 400));
  }
  if (found) {
    ok++;
    if (!dryRun) writeJson(path.join(dir, `${d.id}.json`), { ...d, last_checked: today });
  } else failed.push({ deal: d, why: notes.join("\n") });
}

console.log(`recheck: ${due.length} announced deals due, ${ok} still verified, ${failed.length} need a look`);
if (dryRun) process.exit(0);

if (ok) {
  const file = path.join(ROOT, "data/changelog", `${today}.json`);
  const log: Changelog = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { date: today, entries: [] };
  log.entries.push({ kind: "rechecked", record: "deal", id: "weekly-recheck", summary: `Re-checked ${ok} announced deals; sources still confirm them`, via: "auto" });
  writeJson(file, ChangelogSchema.parse(log));
}
if (failed.length && process.env.GH_TOKEN) {
  const body = failed.map((f) => `### \`${f.deal.id}\` — ${f.deal.title}\n\`\`\`\n${f.why}\n\`\`\``).join("\n\n");
  execFileSync("gh", ["issue", "create", "--title", `Re-check: ${failed.length} deal source(s) no longer verify (${today})`, "--body", `Sources that no longer show the quoted sentence. Find a new source or mark the deal revised/canceled — never delete it.\n\n${body}`, "--label", "data-error"], { stdio: "inherit" });
}
