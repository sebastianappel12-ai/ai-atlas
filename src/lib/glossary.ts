/** Plain-English definitions shown on hover when Explain mode is on. */
export const GLOSSARY: Record<string, string> = {
  HBM: "High Bandwidth Memory: very fast memory chips stacked right next to an AI chip. AI chips can't work without it, and only three companies make it.",
  PPA: "Power Purchase Agreement: a long contract (often 10-20 years) where a company agrees to buy electricity from a specific power plant at a set price.",
  hyperscaler: "One of the giant cloud companies (Microsoft, Amazon, Google, Oracle) that run huge data centers and rent computing power to everyone else.",
  "up to": "A ceiling, not a payment. \"Up to $100 billion\" means the deal could reach that much if everything goes to plan. We never add these to confirmed money.",
  neocloud: "A newer cloud company that rents out AI chips (mostly Nvidia GPUs) instead of the full menu of cloud services.",
  GPU: "Graphics Processing Unit: the chip that trains and runs most AI models. Nvidia sells the majority of them.",
  TPU: "Tensor Processing Unit: Google's own AI chip, designed with Broadcom. Google rents them out through its cloud.",
  backlog: "Money customers have already signed contracts to pay in the future but haven't paid yet. Also called remaining performance obligations (RPO).",
  RPO: "Remaining Performance Obligations: contracted revenue a company hasn't delivered (or been paid for) yet. A measure of future sales already locked in.",
  valuation: "What investors say a private company is worth, based on the price they paid for shares in its latest funding round.",
  foundry: "A chip factory that makes chips other companies design. TSMC is the biggest; it makes chips for Nvidia, AMD, Apple and others.",
  "8-K": "A report US public companies must file with the SEC within days of a major event, like signing a big contract. The most trustworthy source for new deals.",
  "10-Q": "A public company's quarterly report to the SEC, with audited-style numbers and notes on big contracts.",
  MW: "Megawatt: a unit of power. One megawatt can supply roughly 800 US homes. Big AI data centers use hundreds to thousands of MW.",
  GW: "Gigawatt: 1,000 megawatts, about what a large nuclear reactor produces. Enough for roughly 800,000 homes.",
  "balancing authority": "The grid operator that keeps electricity supply and demand matched in a region, such as PJM in the Mid-Atlantic or ERCOT in Texas.",
  "H100-equivalents": "A way to count AI computing power: how many Nvidia H100 chips it would take to match a site's chips.",
  "circular deal": "When money goes around in a loop, for example a chip maker invests in a customer that then spends the money buying that chip maker's chips.",
  exposure: "How much of a company's future sales depend on a single customer. High exposure means one customer leaving would hurt a lot.",
  "confirmed": "A firm dollar amount stated in a filing or official announcement. Shown as a solid line.",
  "estimated": "A dollar amount from news reports or analysts, not from the companies themselves.",
};

export const GLOSSARY_TERMS = Object.keys(GLOSSARY);
