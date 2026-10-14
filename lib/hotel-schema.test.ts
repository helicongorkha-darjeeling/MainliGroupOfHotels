import { describe, expect, it } from "vitest";
import { buildHotelGraph, buildFaqSchema, serializeJsonLd } from "./hotel-schema";
import { publicTeesta } from "./hotel-content";
describe("hotel structured data", () => {
  it("escapes script delimiters without changing parsed facts", () => {
    const payload = { answer: "</script><script>alert(1)</script>" };
    const json = serializeJsonLd(payload);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual(payload);
  });
  it("uses stable room relationships and omits unknown facts", () => {
    const graph = buildHotelGraph(publicTeesta, "https://mainali.example");
    const hotel = graph["@graph"][0];
    expect(hotel).toMatchObject({ "@type": "Hotel", "@id": "https://mainali.example/stays/teesta#hotel", name: "Hotel Teesta" });
    expect(hotel).not.toHaveProperty("telephone");
    expect(hotel).not.toHaveProperty("aggregateRating");
    expect(hotel).not.toHaveProperty("geo");
    const room = graph["@graph"].find(node => typeof node !== "string" && node["@id"] === "https://mainali.example/stays/teesta#room-double-room");
    expect(room).toMatchObject({ "@type": "HotelRoom", occupancy: { maxValue: 2 }, containedInPlace: { "@id": "https://mainali.example/stays/teesta#hotel" } });
    expect(room).not.toHaveProperty("floorSize");
    expect(graph["@graph"].some(node => typeof node !== "string" && node["@type"] === "EventVenue")).toBe(false);
  });
  it("includes supplied factual room size, hotel coordinates, rating and venue", () => {
    const hotel = { ...publicTeesta, telephone: "+911234567890", geo: { latitude: 27.04, longitude: 88.26 }, checkinTime: "14:00", checkoutTime: "11:00", aggregateRating: { ratingValue: 4.5, reviewCount: 12, source: "Guest survey" }, venue: { id: "meeting-room", name: "Meeting room", description: "A meeting room", capacity: 20 }, rooms: [{ ...publicTeesta.rooms[0], sizeSqM: 20 }] };
    const graph = buildHotelGraph(hotel, "https://mainali.example");
    expect(graph["@graph"][0]).toMatchObject({ telephone: "+911234567890", checkinTime: "14:00", checkoutTime: "11:00", geo: { latitude: 27.04, longitude: 88.26 }, aggregateRating: { ratingValue: 4.5, reviewCount: 12 } });
    expect(graph["@graph"][1]).toMatchObject({ floorSize: { value: 20, unitCode: "MTK" } });
    expect(graph["@graph"].find(node => typeof node !== "string" && node["@type"] === "EventVenue")).toMatchObject({ maximumAttendeeCapacity: 20 });
  });
  it("preserves FAQ answers exactly, including punctuation and categories", () => {
    const schema = buildFaqSchema([{ question: "Breakfast?", answer: "Please ask the hotel; it is not a confirmed inclusion.", category: "Dining" }], "https://mainali.example/stays/teesta");
    expect(schema.mainEntity).toEqual([{ "@type": "Question", name: "Breakfast?", acceptedAnswer: { "@type": "Answer", text: "Please ask the hotel; it is not a confirmed inclusion." } }]);
  });
});

