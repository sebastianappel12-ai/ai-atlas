import type { MetadataRoute } from "next";
import { readGraph } from "@/lib/data-server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-atlas-pearl.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const g = readGraph();
  const updated = g.generated.slice(0, 10);
  return [
    { url: `${SITE}/`, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/energy`, lastModified: updated, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/changes`, lastModified: updated, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE}/methodology`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ...g.companies.map((c) => ({ url: `${SITE}/company/${c.id}`, lastModified: updated, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
