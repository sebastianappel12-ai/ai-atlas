import type { Sector } from "./schema";

export interface SectorInfo {
  id: Sector;
  label: string;
  short: string;
  color: string;
  examples: string;
  explain: string;
}

/** The 10 sectors and their glow colors. Order is the legend order. */
export const SECTOR_INFO: Record<Sector, SectorInfo> = {
  ai_lab: {
    id: "ai_lab",
    label: "AI labs",
    short: "Labs",
    color: "#b794f6",
    examples: "OpenAI, Anthropic, xAI, Meta",
    explain: "Companies that build and train the AI models themselves. They are the biggest buyers of computing power.",
  },
  cloud: {
    id: "cloud",
    label: "Cloud giants",
    short: "Cloud",
    color: "#4f9cff",
    examples: "Microsoft, Amazon, Google, Oracle",
    explain: "The four huge cloud companies (\"hyperscalers\") that rent out computers by the hour and build most of the data centers.",
  },
  neocloud: {
    id: "neocloud",
    label: "Neoclouds",
    short: "Neocloud",
    color: "#2fd3e0",
    examples: "CoreWeave, Nebius, Lambda",
    explain: "Newer cloud companies that rent out AI chips (mostly Nvidia GPUs) and nothing else.",
  },
  chip_designer: {
    id: "chip_designer",
    label: "Chip designers",
    short: "Chips",
    color: "#3ddc84",
    examples: "Nvidia, AMD, Broadcom",
    explain: "Companies that design AI chips. Most of them don't own factories; they pay foundries like TSMC to make the chips.",
  },
  chip_factory: {
    id: "chip_factory",
    label: "Chip factories & packaging",
    short: "Fabs",
    color: "#b5e550",
    examples: "TSMC, Samsung, Intel",
    explain: "Factories (\"fabs\") that physically make and package chips, plus the companies that sell them the machines.",
  },
  memory: {
    id: "memory",
    label: "Memory & storage",
    short: "Memory",
    color: "#ffb347",
    examples: "Micron, SK hynix, SanDisk",
    explain: "Makers of memory chips (like HBM, the fast memory stacked next to AI chips) and storage drives.",
  },
  networking: {
    id: "networking",
    label: "Networking & equipment",
    short: "Equipment",
    color: "#ff6fae",
    examples: "Arista, Corning, Vertiv",
    explain: "Everything else inside a data center: network switches, fiber cables, servers, cooling and power gear.",
  },
  dc_builder: {
    id: "dc_builder",
    label: "Data center builders",
    short: "Builders",
    color: "#9fb3c8",
    examples: "Digital Realty, Equinix, Applied Digital",
    explain: "Companies that build data center buildings and lease them to cloud companies and AI labs.",
  },
  power: {
    id: "power",
    label: "Power companies",
    short: "Power",
    color: "#ffe14d",
    examples: "Vistra, Constellation, Oklo",
    explain: "Utilities and power plant owners that sell electricity to data centers, including new nuclear startups.",
  },
  investor: {
    id: "investor",
    label: "Investors",
    short: "Investors",
    color: "#ff6b6b",
    examples: "SoftBank, VCs, sovereign funds",
    explain: "Funds and investment firms that put money into AI companies and data centers in exchange for ownership or interest.",
  },
};

export const SECTOR_ORDER = Object.keys(SECTOR_INFO) as Sector[];

/** The single accent color used for whatever is selected. */
export const ACCENT = "#ffffff";
