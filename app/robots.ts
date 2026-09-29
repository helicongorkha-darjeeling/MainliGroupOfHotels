import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const isLive = process.env.BOOKING_MODE === "live";

  return {
    rules: isLive ? { userAgent: "*", allow: "/" } : { userAgent: "*", disallow: "/" },
    sitemap: isLive ? `${siteUrl}/sitemap.xml` : undefined,
  };
}
