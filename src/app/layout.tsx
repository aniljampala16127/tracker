import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ClientLayout } from "@/components/ClientLayout";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";

export const metadata: Metadata = {
  title: "SponsorTrack — Canada Spousal Sponsorship Tracker | Real IRCC Processing Times",
  description:
    "Free community tracker for Canadian spousal sponsorship. See real IRCC processing times from 300+ applicants, AOR predictions, step-by-step timeline, and completion estimates. Track outland and inland spousal sponsorship progress.",
  keywords: [
    "spousal sponsorship",
    "Canada immigration",
    "IRCC processing times",
    "PR application tracker",
    "family sponsorship",
    "spousal sponsorship processing time",
    "how long does spousal sponsorship take",
    "IRCC spousal sponsorship tracker",
    "Canada spousal sponsorship AOR",
    "outland sponsorship tracker",
    "inland sponsorship tracker",
    "spousal sponsorship timeline",
    "Canada PR spousal",
    "IRCC processing time 2025",
    "IRCC processing time 2026",
    "spousal sponsorship community",
  ],
  verification: {
    google: "rQ_KqoeFExJQLOe78nzhwijcI21dZ9iDmyipiw887U4",
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
  viewportFit: "cover",
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "SponsorTrack",
          "url": "https://sponsortrack.online",
          "description": "Free community tracker for Canadian spousal sponsorship applications. Real IRCC processing times from 300+ applicants.",
          "applicationCategory": "UtilitiesApplication",
          "operatingSystem": "Any",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "CAD" },
          "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "300" },
          "author": { "@type": "Person", "name": "Anil Jampala" }
        })}} />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var t = localStorage.getItem('sponsortrack-theme');
            if (t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          })();
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                // Check for updates immediately and every 30 minutes
                reg.update();
                setInterval(function() { reg.update(); }, 30 * 60 * 1000);
              });
            });
          }
        `}} />
      </head>
      <body className="min-h-screen bg-sand-50 text-sand-900 font-sans flex flex-col">
        <Nav />
        <ClientLayout>{children}</ClientLayout>
        <PWAInstallBanner />
        <footer className="border-t border-sand-200 sm:pb-0" style={{ paddingBottom: "calc(70px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="max-w-5xl mx-auto px-4 py-4 text-center text-[10px] text-sand-400">
            <div>SponsorTrack · Not affiliated with IRCC · Community-reported data</div>
            <a href="https://buymeacoffee.com/aniljampala" target="_blank" rel="noopener noreferrer"
              className="inline-block mt-1.5 text-sand-400 hover:text-brand-600 transition-colors">
              Support this project
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
