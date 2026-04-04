import { Metadata } from "next";
import { COMMON_COUNTRIES } from "@/lib/constants";
import CountryPageClient from "./client";

function slugToCountry(slug: string): string | null {
  const decoded = decodeURIComponent(slug).toLowerCase().replace(/-/g, " ");
  return COMMON_COUNTRIES.find(c => c.toLowerCase() === decoded || c.toLowerCase().replace(/\s+/g, "-") === slug.toLowerCase()) || null;
}

export function generateStaticParams() {
  return COMMON_COUNTRIES
    .filter(c => c !== "Other" && c !== "EU")
    .map(c => ({ slug: c.toLowerCase().replace(/\s+/g, "-") }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const country = slugToCountry(params.slug) || params.slug;
  return {
    title: `${country} — Canada Spousal Sponsorship Processing Times | SponsorTrack`,
    description: `Real community-reported processing times for ${country} spousal sponsorship applications to Canada. Average AOR wait, step-by-step timelines, and Outland vs Inland comparisons.`,
    keywords: `${country} spousal sponsorship, ${country} Canada PR, ${country} IRCC processing time, ${country} AOR wait time`,
    openGraph: {
      title: `${country} — Spousal Sponsorship Times | SponsorTrack`,
      description: `How long does ${country} spousal sponsorship take? Real data from the community.`,
      images: ["https://sponsortrack.online/api/og"],
    },
  };
}

export default function CountryPage({ params }: { params: { slug: string } }) {
  const country = slugToCountry(params.slug);
  return <CountryPageClient slug={params.slug} country={country} />;
}
