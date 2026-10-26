/**
 * Quote checking: does the exact sentence a deal cites really appear on its
 * source page? This is the code check that stops made-up deals, used by both
 * the seed scripts and the daily agent.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  ndash: "-",
  mdash: "-",
  hellip: "...",
  shy: "",
  zwj: "",
  zwnj: "",
  trade: "™",
  reg: "®",
  copy: "©",
  eacute: "é",
  euro: "€",
  pound: "£",
  dollar: "$",
  percnt: "%",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Turn an HTML page into plain visible-ish text. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|td|th|section|article)>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  );
}

/** Normalize text so typography differences don't cause false misses. */
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[‘’‚‛′`´]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/[  -​  　]/g, " ")
    .replace(/[­‌‍﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function quoteAppearsIn(pageText: string, quote: string): boolean {
  const page = normalizeForMatch(pageText);
  const q = normalizeForMatch(quote).replace(/^["']|["']$/g, "");
  if (q.length < 10) return false;
  if (page.includes(q)) return true;
  // Tolerate a trailing period mismatch or ellipsis-free sentence end.
  return page.includes(q.replace(/[.]+$/, ""));
}

export type QuoteCheckStatus = "found" | "not_found" | "blocked" | "error" | "unsupported";

export interface QuoteCheckResult {
  status: QuoteCheckStatus;
  http?: number;
  detail?: string;
}

const SEC_CONTACT = process.env.SEC_CONTACT ?? "sebastianappel12@gmail.com";

/** Honest user agents. sec.gov requires contact info; everyone else gets the bot name. */
export function userAgentFor(url: string): string {
  const host = new URL(url).hostname;
  if (host.endsWith("sec.gov")) return `AI Atlas research ${SEC_CONTACT}`;
  return "AIAtlasBot/0.1 (+https://github.com/sebastianappel12-ai/ai-atlas)";
}

export async function fetchPageText(url: string, timeoutMs = 20000): Promise<{ http: number; text: string; contentType: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgentFor(url), Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();
    const text = /html|xml/i.test(contentType) || /^\s*</.test(body) ? htmlToText(body) : body;
    return { http: res.status, text, contentType };
  } finally {
    clearTimeout(t);
  }
}

export async function checkQuote(url: string, quote: string): Promise<QuoteCheckResult> {
  try {
    if (/\.pdf($|\?)/i.test(url)) return { status: "unsupported", detail: "PDF sources are checked by hand" };
    const { http, text, contentType } = await fetchPageText(url);
    if (http === 401 || http === 403 || http === 429 || http === 451) return { status: "blocked", http };
    if (http >= 400) return { status: "error", http, detail: `HTTP ${http}` };
    if (/application\/pdf/i.test(contentType)) return { status: "unsupported", http, detail: "PDF" };
    return quoteAppearsIn(text, quote) ? { status: "found", http } : { status: "not_found", http };
  } catch (e) {
    return { status: "error", detail: e instanceof Error ? e.message : String(e) };
  }
}
