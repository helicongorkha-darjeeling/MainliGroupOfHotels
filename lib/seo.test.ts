import { describe, expect, it } from "vitest";
import { indexingEnabled, siteMetadata, publicRobots, publicSitemap, privatePrefixes } from "./seo";
const production = { NODE_ENV: "production", SITE_INDEXING: "enabled", NEXT_PUBLIC_SITE_URL: "https://mainali.example", BOOKING_MODE: "preview" };
describe("public search visibility", () => {
  it("allows a production hotel site independently of payment readiness", () => {
    expect(indexingEnabled(production)).toBe(true);
    expect(indexingEnabled({ ...production, BOOKING_MODE: "live", SITE_INDEXING: "disabled" })).toBe(false);
  });
  it.each(["http://localhost:3000", "https://localhost", "https://127.0.0.1", "", "not-a-url"])("rejects non-public origin %s", (url) => {
    expect(indexingEnabled({ ...production, NEXT_PUBLIC_SITE_URL: url })).toBe(false);
  });
  it("blocks local and Vercel preview builds", () => {
    expect(indexingEnabled({ ...production, NODE_ENV: "development" })).toBe(false);
    expect(indexingEnabled({ ...production, VERCEL_ENV: "preview" })).toBe(false);
    expect(indexingEnabled({ ...production, SITE_INDEXING: undefined })).toBe(false);
  });
  it("allows public search agents with the same private exclusions", () => {
    const rules = publicRobots(production).rules;
    expect(rules).toMatchObject({ userAgent: "*", allow: "/" });
    expect((rules as { disallow: string[] }).disallow).toEqual(expect.arrayContaining(["/staff/", "/admin/", "/api/", "/book", "/invoice/"]));
    expect(privatePrefixes).toContain("/rooms");
  });
  it("does not publish preview sitemap entries or private URLs", () => {
    expect(publicSitemap({ ...production, SITE_INDEXING: "disabled" })).toEqual([]);
    const urls = publicSitemap(production).map(item => item.url);
    expect(urls).toContain("https://mainali.example/stays/teesta");
    expect(urls.some(url => /offers|\/book$|\/rooms$|\/hotels\/teesta/.test(url))).toBe(false);
  });
  it("gives each public page its own canonical and open graph URL", () => {
    expect(siteMetadata("/contact", "Contact", "Find the hotel", production)).toMatchObject({
      alternates: { canonical: "https://mainali.example/contact" },
      openGraph: { url: "https://mainali.example/contact" },
    });
  });
});

