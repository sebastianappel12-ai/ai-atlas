import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ExplainProvider } from "@/components/explain";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-atlas-pearl.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "AI Atlas: how money and power move through AI", template: "%s · AI Atlas" },
  description: "An interactive map of the AI industry: who pays whom, with a source for every deal, plus the data centers and power plants behind it.",
  openGraph: { type: "website", siteName: "AI Atlas" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only z-50 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Skip to content
        </a>
        <ExplainProvider>
          <SiteHeader />
          {children}
        </ExplainProvider>
        <Analytics />
      </body>
    </html>
  );
}
