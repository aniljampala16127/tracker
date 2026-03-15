import type { Metadata } from "next";
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
  openGraph: {
    title: "SponsorTrack — Canada Spousal Sponsorship Tracker",
    description:
      "Free community tracker for Canadian spousal sponsorship applications. See real processing times.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-sand-50 text-sand-900 font-sans">
        <Nav />
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
        <footer className="border-t border-sand-200 mt-16">
          <div className="max-w-4xl mx-auto px-4 py-8 text-center text-xs text-sand-400">
            <p>
              SponsorTrack is a community tool. Not affiliated with IRCC or the
              Government of Canada.
            </p>
            <p className="mt-1">
              Processing times are community-reported and may not reflect
              official IRCC estimates.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
