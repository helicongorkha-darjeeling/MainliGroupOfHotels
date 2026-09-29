import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const updated = new Date("2026-09-29T00:00:00+05:30");
  return [
    { url: siteUrl, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/stays/teesta`, lastModified: updated, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/contact`, lastModified: updated, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/policies/booking-terms`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/policies/refunds`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/policies/privacy`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
  ];
}
