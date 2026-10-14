import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HotelFAQ } from "../sections/HotelFAQ";
import { RoomComparisonTable } from "../rooms/RoomComparisonTable";
import { publicTeesta } from "@/lib/hotel-content";
describe("visible SEO facts", () => {
  it("renders the same FAQ text in HTML and JSON-LD with native accordions", () => {
    const html = renderToStaticMarkup(<HotelFAQ faqs={[{ question: "Breakfast?", answer: "Ask the hotel." }]} pageUrl="https://mainali.example/stays/teesta" />);
    expect(html).toContain("<details");
    expect(html).toMatch(/<summary[^>]*>Breakfast\?/);
    expect(html).toContain("<p>Ask the hotel.</p>");
    const json = JSON.parse(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1]);
    expect(json.mainEntity[0].acceptedAnswer.text).toBe("Ask the hotel.");
  });
  it("keeps total guests distinct from unverified child policies and room inclusions", () => {
    const html = renderToStaticMarkup(<RoomComparisonTable rooms={publicTeesta.rooms} />);
    expect(html).toContain("<caption>");
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
    expect(html).toContain('scope="row"');
    expect(html).toContain("Up to 2 guests");
    expect(html).toContain("Child policy: on request");
    expect(html).toContain("for 1 guest");
    expect(html).not.toContain("Complimentary breakfast");
    expect(html).not.toContain("250 Mbps");
  });
});

