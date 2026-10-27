/**
 * The daily agent's inbox: page texts saved by a GitHub Action on the `agent-inbox` branch.
 * The cloud agent's network can't reach news or SEC sites, so it reads these instead, and the
 * quote check reads them straight from git (the Action's copy), never from a file the agent wrote.
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

export const INBOX_REF = process.env.AGENT_INBOX_REF; // e.g. "origin/agent-inbox"

export function pageKey(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
}

/** Text of a saved page from the inbox branch, or undefined if it isn't there. */
export function inboxPageText(url: string, ref = INBOX_REF): string | undefined {
  if (!ref) return undefined;
  try {
    return execFileSync("git", ["show", `${ref}:pages/${pageKey(url)}.txt`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return undefined;
  }
}
