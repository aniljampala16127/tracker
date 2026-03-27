import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "SponsorTrack — Canada Spousal Sponsorship Tracker",
  description:
    "Track your Canadian spousal sponsorship application alongside the community. Real-time processing averages, step-by-step timeline, and monthly cohort comparisons.",
  keywords: [
    "spousal sponsorship",
    "Canada immigration",
    "IRCC processing times",
    "PR application tracker",
    "family sponsorship",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SponsorTrack",
  },
  openGraph: {
    title: "SponsorTrack — Canada Spousal Sponsorship Tracker",
    description:
      "Free community tracker for Canadian spousal sponsorship applications. See real processing times.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#2D6A4F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-sand-50 text-sand-900 font-sans">
        <Nav />
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
        <footer className="border-t border-sand-200 mt-16">
          <div className="max-w-5xl mx-auto px-4 py-6 text-center text-[10px] text-sand-400">
            SponsorTrack · Not affiliated with IRCC · Community-reported data
          </div>
        </footer>
      </body>
    </html>
  );
}
