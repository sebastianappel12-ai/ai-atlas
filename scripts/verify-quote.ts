/**
 * Check one quote against its source page.
 *   npx tsx scripts/verify-quote.ts <url> "<exact sentence>"
 * Prints FOUND, NOT_FOUND, BLOCKED, ERROR or UNSUPPORTED. Exit code 0 only on FOUND.
 */
import { checkQuote } from "../src/lib/quote";

const [url, quote] = process.argv.slice(2);
if (!url || !quote) {
  console.error('usage: npx tsx scripts/verify-quote.ts <url> "<quote>"');
  process.exit(2);
}

const r = await checkQuote(url, quote);
console.log([r.status.toUpperCase(), r.http ? `http=${r.http}` : "", r.detail ?? ""].filter(Boolean).join(" "));
process.exit(r.status === "found" ? 0 : 1);
