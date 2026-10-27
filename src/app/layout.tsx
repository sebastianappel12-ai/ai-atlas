import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ExplainProvider } from "@/components/explain";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-atlas.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "AI Atlas — how money and power move through AI", template: "%s · AI Atlas" },
  description: "An interactive map of the AI industry: who pays whom, with a source for every deal, plus the data centers and power plants behind it.",
  openGraph: { type: "website", siteName: "AI Atlas" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#05070b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ExplainProvider>
          <SiteHeader />
          {children}
        </ExplainProvider>
        <Analytics />
      </body>
    </html>
  );
}
