import { COMMON_COUNTRIES } from "@/lib/constants";
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://tracker-lime-five.vercel.app";
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/dashboard`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/stats`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/calculator`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/me`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
  ];

  const countryPages: MetadataRoute.Sitemap = COMMON_COUNTRIES
    .filter(c => c !== "Other" && c !== "EU")
    .map(c => ({
      url: `${base}/country/${c.toLowerCase().replace(/\s+/g, "-")}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

  return [...staticPages, ...countryPages];
}
