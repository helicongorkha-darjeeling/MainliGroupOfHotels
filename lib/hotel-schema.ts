import type { Hotel, HotelRoom, FAQPage, EventVenue, Graph } from "schema-dts";
import type { HotelFaq, PublicHotel } from "./hotel-content";
import { roomStartingPrice } from "./hotel-content";
export function serializeJsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
const amenities = (facts: PublicHotel["amenities"]) => facts.map(fact => ({ "@type": "LocationFeatureSpecification" as const, name: fact.label, value: fact.value }));
export function buildHotelGraph(hotel: PublicHotel, origin: string): { "@context": "https://schema.org"; "@graph": (Hotel | HotelRoom | EventVenue)[] } {
  const url = new URL(hotel.canonicalPath, origin).href;
  const hotelId = url + "#hotel";
  const hotelNode: Hotel = {
    "@type": "Hotel", "@id": hotelId, url, name: hotel.name, description: hotel.description,
    address: { "@type": "PostalAddress", ...hotel.address }, numberOfRooms: hotel.inventoryCount,
    amenityFeature: amenities(hotel.amenities),
    containsPlace: hotel.rooms.map(room => ({ "@id": url + "#room-" + room.id })),
    ...(hotel.rooms[0]?.startingRate ? { priceRange: roomStartingPrice(hotel.rooms[0]) } : {}),
    ...(hotel.telephone ? { telephone: hotel.telephone } : {}),
    ...(hotel.geo ? { geo: { "@type": "GeoCoordinates", ...hotel.geo } } : {}),
    ...(hotel.checkinTime ? { checkinTime: hotel.checkinTime } : {}),
    ...(hotel.checkoutTime ? { checkoutTime: hotel.checkoutTime } : {}),
    ...(hotel.aggregateRating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: hotel.aggregateRating.ratingValue, reviewCount: hotel.aggregateRating.reviewCount, bestRating: 5, worstRating: 1 } } : {}),
    image: hotel.rooms.filter(room => room.photo).map(room => origin + "/branded-images/" + room.photo!.split("/").pop()),
  };
  const roomNodes: HotelRoom[] = hotel.rooms.map(room => ({
    "@type": "HotelRoom", "@id": url + "#room-" + room.id, name: room.name, description: room.description,
    containedInPlace: { "@id": hotelId }, occupancy: { "@type": "QuantitativeValue", maxValue: room.maxGuests },
    ...(room.bedConfiguration !== "On request" ? { bed: room.bedConfiguration } : {}),
    ...(room.sizeSqM !== undefined ? { floorSize: { "@type": "QuantitativeValue", value: room.sizeSqM, unitCode: "MTK" } } : {}),
    ...(room.inclusions.length ? { amenityFeature: amenities(room.inclusions) } : {}),
    ...(room.photo ? { image: origin + "/branded-images/" + room.photo.split("/").pop() } : {}),
  }));
  const venue: EventVenue[] = hotel.venue ? [{
    "@type": "EventVenue", "@id": url + "#venue-" + hotel.venue.id, name: hotel.venue.name,
    description: hotel.venue.description, maximumAttendeeCapacity: hotel.venue.capacity,
    containedInPlace: { "@id": hotelId }, address: { "@type": "PostalAddress", ...hotel.address },
  }] : [];
  return { "@context": "https://schema.org", "@graph": [hotelNode, ...roomNodes, ...venue] } satisfies Graph;
}
export function buildFaqSchema(faqs: HotelFaq[], pageUrl: string): FAQPage & { "@context": "https://schema.org" } {
  return { "@context": "https://schema.org", "@type": "FAQPage", "@id": pageUrl + "#faq",
    mainEntity: faqs.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) };
}

