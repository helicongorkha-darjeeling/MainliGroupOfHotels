import type { Metadata, MetadataRoute } from "next";
type Environment = Record<string, string | undefined>;
export const privatePrefixes = ["/staff", "/admin", "/api", "/auth", "/invoice", "/staff/", "/admin/", "/api/", "/book", "/rooms", "/my-bookings", "/members", "/auth/", "/invoice/"];
export const contentUpdated = "2026-10-13T00:00:00+05:30";
export function siteOrigin(env: Environment = process.env) {
  try { return new URL(env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").origin; }
  catch { return "http://localhost:3000"; }
}
export function indexingEnabled(env: Environment = process.env) {
  if (env.NODE_ENV !== "production" || env.SITE_INDEXING !== "enabled" || (env.VERCEL_ENV && env.VERCEL_ENV !== "production")) return false;
  try {
    const url = new URL(env.NEXT_PUBLIC_SITE_URL || "");
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password && host.includes(".") &&
      host !== "localhost" && !host.endsWith(".localhost") && !host.endsWith(".local") &&
      !/^(\d{1,3}\.){3}\d{1,3}$/.test(host) && !host.includes(":");
  } catch { return false; }
}
export function siteMetadata(path: string, title: string, description: string, env: Environment = process.env): Metadata {
  const origin = siteOrigin(env);
  const url = new URL(path, origin).href;
  return {
    title, description, alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Mainali Hospitality", locale: "en_IN", type: "website", images: [{ url: origin + "/branded-images/teesta-exterior-front-card.webp", width: 1200, height: 900, alt: "Hotel Teesta in Darjeeling" }] },
    twitter: { card: "summary_large_image", title, description, images: [origin + "/branded-images/teesta-exterior-front-card.webp"] },
  };
}
export function publicRobots(env: Environment = process.env): MetadataRoute.Robots {
  return indexingEnabled(env)
    ? { rules: { userAgent: "*", allow: "/", disallow: privatePrefixes }, sitemap: siteOrigin(env) + "/sitemap.xml" }
    : { rules: { userAgent: "*", disallow: "/" } };
}
export function publicSitemap(env: Environment = process.env): MetadataRoute.Sitemap {
  if (!indexingEnabled(env)) return [];
  return ["", "/hotels", "/stays/teesta", "/experiences", "/our-story", "/contact", "/policies/booking-terms", "/policies/refunds", "/policies/privacy"].map(path => ({
    url: siteOrigin(env) + path, lastModified: contentUpdated,
  }));
}

