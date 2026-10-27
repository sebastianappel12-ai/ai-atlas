/**
 * The cloud agent's view of today's inbox (saved by the "Agent inbox" GitHub Action).
 *   npx tsx scripts/inbox.ts                    # list today's items with their saved pages
 *   npx tsx scripts/inbox.ts show <n>            # print item n's saved page text
 *   npx tsx scripts/inbox.ts grep <n> <words>    # sentences on item n's pages containing the words
 * Reads from git ref AGENT_INBOX_REF (default origin/agent-inbox); run `git fetch origin agent-inbox` first.
 */
import { execFileSync } from "node:child_process";
import type { Item } from "../src/lib/agent/collect";
import { inboxPageText } from "../src/lib/inbox";

const ref = process.env.AGENT_INBOX_REF ?? "origin/agent-inbox";
const [cmd, nArg, ...rest] = process.argv.slice(2);
const inbox = JSON.parse(execFileSync("git", ["show", `${ref}:items.json`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })) as {
  date: string;
  fetched: string;
  items: Item[];
  pages: Record<string, { key: string; http: number | null; chars: number; error?: string }>;
};

if (!cmd) {
  console.log(`inbox ${inbox.date} (fetched ${inbox.fetched}): ${inbox.items.length} items`);
  inbox.items.forEach((it, i) => {
    const urls = [it.url, ...(it.extraUrls ?? [])];
    console.log(`${i}. [${it.origin}] ${it.date} ${it.title}`);
    for (const u of urls) {
      const p = inbox.pages[u];
      console.log(`   ${u}  ${p?.chars ? `(${p.chars.toLocaleString("en-US")} chars saved)` : `(not saved: ${p?.error ?? `HTTP ${p?.http}`})`}`);
    }
  });
} else {
  const it = inbox.items[Number(nArg)];
  if (!it) throw new Error(`no item ${nArg}`);
  for (const u of [it.url, ...(it.extraUrls ?? [])]) {
    const text = inboxPageText(u, ref);
    console.log(`\n===== ${u} =====`);
    if (!text) {
      console.log("(not saved)");
      continue;
    }
    if (cmd === "show") console.log(text.slice(0, 60000) + (text.length > 60000 ? `\n… (${text.length - 60000} more chars; use grep)` : ""));
    else if (cmd === "grep") {
      const words = rest.map((w) => w.toLowerCase());
      const hits = text.split(/(?<=[.!?]["”]?)\s+/).filter((s) => words.every((w) => s.toLowerCase().includes(w)));
      for (const h of hits.slice(0, 40)) console.log(`- ${h}`);
      if (!hits.length) console.log("(no sentence contains all of those words)");
    }
  }
}
