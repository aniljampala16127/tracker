import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ClientLayout } from "@/components/ClientLayout";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";

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
  verification: {
    google: "59KnbqBJoeD2akfgK9NxJShfbusGsccubengzXEsrE4",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SponsorTrack",
  },
  openGraph: {
    title: "SponsorTrack — Canada Spousal Sponsorship Tracker",
    description:
      "Free community tracker for Canadian spousal sponsorship applications. Real processing times, AOR predictions, and milestone celebrations.",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "SponsorTrack — Canada Spousal Sponsorship Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SponsorTrack — Canada Spousal Sponsorship Tracker",
    description: "Free community tracker with real IRCC processing times, AOR predictions, and cohort comparisons.",
    images: ["/api/og"],
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: `
          document.documentElement.classList.remove('dark');
          try { localStorage.removeItem('sponsortrack-theme'); } catch(e) {}
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </head>
      <body className="min-h-screen bg-sand-50 text-sand-900 font-sans">
        <Nav />
        <ClientLayout>{children}</ClientLayout>
        <PWAInstallBanner />
        <footer className="border-t border-sand-200 mt-16">
          <div className="max-w-5xl mx-auto px-4 py-6 text-center text-[10px] text-sand-400">
            <div>SponsorTrack · Not affiliated with IRCC · Community-reported data</div>
            <a href="https://buymeacoffee.com/g9v9j4ct4sa" target="_blank" rel="noopener noreferrer"
              className="inline-block mt-1.5 text-sand-400 hover:text-brand-600 transition-colors">
              Support this project
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
