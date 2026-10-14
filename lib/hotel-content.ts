import { teesta } from "./property";
import { teestaRoomTypes } from "./room-types";
import { formatInr, teestaRates } from "./rates";
export type AmenityFact = { label: string; value: string };
export type HotelFaq = { question: string; answer: string; category?: string };
export type PublicRoom = {
  id: string; name: string; description: string; maxGuests: number; bedConfiguration: string;
  photo?: string; sizeSqM?: number; maxAdults?: number; maxChildren?: number;
  inclusions: AmenityFact[]; startingRate?: { amountPaise: number; forGuests: number };
};
export type PublicHotel = {
  name: string; description: string; canonicalPath: string; address: { streetAddress: string; addressLocality: string; addressRegion: string; postalCode: string; addressCountry: string };
  inventoryCount: number; amenities: AmenityFact[]; rooms: PublicRoom[]; faqs: HotelFaq[];
  telephone?: string; whatsapp?: string; mapUrl?: string; geo?: { latitude: number; longitude: number };
  checkinTime?: string; checkoutTime?: string;
  aggregateRating?: { ratingValue: number; reviewCount: number; source: string };
  venue?: { id: string; name: string; description: string; capacity: number };
};
export const startingPrice = formatInr(teestaRates.singleOccupancyPaise);
export const publishedRateStatement = `${formatInr(teestaRates.singleOccupancyPaise)} for one guest, ${formatInr(teestaRates.doubleOccupancyPaise)} for two, and ${formatInr(teestaRates.groupPerGuestPaise)} per guest for parties of three or more, each night. Seasonal rates may apply; taxes await confirmation.`;
export function roomStartingPrice(room: PublicRoom) {
  return room.startingRate ? `From ${formatInr(room.startingRate.amountPaise)} for ${room.startingRate.forGuests} guest${room.startingRate.forGuests === 1 ? "" : "s"} / night` : "On request";
}
export const publicTeesta: PublicHotel = {
  name: teesta.name, description: teesta.summary, canonicalPath: "/stays/teesta", inventoryCount: teesta.inventoryCount,
  address: { streetAddress: "13/1 Botanical Garden Road, opposite Bus Stand, Laldhiki, Chauk Bazaar", addressLocality: "Darjeeling", addressRegion: "West Bengal", postalCode: "734101", addressCountry: "IN" },
  // Add phone, coordinates, times, ratings and venue here only after verification.
  amenities: [
    { label: "Wi-Fi", value: "Free at the hotel" },
    { label: "Hot water", value: "Available" },
    { label: "Restaurant", value: "On-site restaurant" },
    { label: "Room service", value: "Available" },
    { label: "In-room dining", value: "Available" },
    { label: "Cars", value: "Available 24/7; ask the hotel to arrange" },
    { label: "Tour packages", value: "Available on request" },
  ],
  rooms: teestaRoomTypes.map(room => ({
    id: room.id, name: room.name,
    description: room.id === "six-person-room" ? "Capacity for six guests. Ask the hotel for its bed layout and photographs." : room.description,
    maxGuests: room.maxGuests, bedConfiguration: room.id === "double-room" ? "One double bed" : room.id === "triple-room" ? "Two-bed layout" : room.id === "four-person-room" ? "Two double beds" : room.id === "family-room-sofa" ? "Two beds and sofa seating" : "On request",
    photo: room.id === "six-person-room" ? undefined : room.photo,
    inclusions: [],
    ...(room.id === "double-room" ? { startingRate: { amountPaise: teestaRates.singleOccupancyPaise, forGuests: 1 } } : {}),
  })),
  faqs: [
    { question: "When can I check in and check out?", answer: "Check-in and checkout times are awaiting hotel confirmation. Please confirm your arrival time with the hotel.", category: "Your stay" },
    { question: "What ID do I need?", answer: "Indian guests: a government photo ID. Foreign guests: passport and visa. The front desk records identification details at check-in.", category: "Your stay" },
    { question: "How do I pay?", answer: "Online payment is being prepared. Payment methods will appear in secure checkout once the hotel confirms tax and payment setup. Browsing and signing in do not take payment.", category: "Booking" },
    { question: "Can I cancel?", answer: "Unpaid holds can be cancelled in My bookings. The paid cancellation and refund schedule is awaiting hotel approval; read our cancellation and refund policy before booking.", category: "Booking" },
    { question: "Is Wi-Fi available?", answer: "Wi-Fi is free at Hotel Teesta.", category: "Facilities" },
    { question: "Is breakfast included?", answer: "Breakfast has not been confirmed as a room inclusion. Please ask the hotel.", category: "Facilities" },
    { question: "Where is Hotel Teesta?", answer: "Hotel Teesta is at 13/1 Botanical Garden Road, opposite Bus Stand, Laldhiki, Chauk Bazaar, Darjeeling, West Bengal 734101.", category: "Location" },
  ],
};
export const hotelAddress = [publicTeesta.address.streetAddress, publicTeesta.address.addressLocality, publicTeesta.address.addressRegion, publicTeesta.address.postalCode].join(", ");
export const hotelMapUrl = publicTeesta.mapUrl ?? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(publicTeesta.name + ", " + hotelAddress);

