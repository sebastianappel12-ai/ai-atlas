import { describe, expect, it } from "vitest";
import { htmlToText, quoteAppearsIn } from "../src/lib/quote";

describe("quote check", () => {
  const html = `<html><head><script>var x="Nvidia invests";</script></head><body>
    <p>NVIDIA&nbsp;and CoreWeave today announced that NVIDIA has invested <b>$2&nbsp;billion</b>
    in CoreWeave’s Class&nbsp;A common stock.</p></body></html>`;
  const text = htmlToText(html);

  it("finds a quote across tags, entities and curly apostrophes", () => {
    expect(quoteAppearsIn(text, "NVIDIA has invested $2 billion in CoreWeave's Class A common stock.")).toBe(true);
  });

  it("does not find a made-up quote", () => {
    expect(quoteAppearsIn(text, "NVIDIA has invested $20 billion in CoreWeave's Class A common stock.")).toBe(false);
  });

  it("ignores script contents", () => {
    expect(quoteAppearsIn(text, 'var x="Nvidia invests"')).toBe(false);
  });
});
