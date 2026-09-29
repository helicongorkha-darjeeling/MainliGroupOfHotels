export const teesta = {
  name: "Hotel Teesta",
  group: "Mainali Group of Hotels",
  place: "Darjeeling",
  status: "draft" as const,
  liveBookingEnabled: false,
  summary:
    "A welcoming Darjeeling stay with comfortable double rooms for solo travellers, couples and small groups travelling together.",
  gallery: [
    { src: "/images/teesta-exterior.webp", alt: "Exterior of Hotel Teesta in Darjeeling" },
    { src: "/images/teesta-double-room.webp", alt: "A photographed guest room at Hotel Teesta" },
    { src: "/images/teesta-dining.webp", alt: "Dining space photographed at Hotel Teesta" },
    { src: "/images/teesta-reception.webp", alt: "Reception desk photographed at Hotel Teesta" },
  ],
  publicRoom: {
    id: "double-room",
    name: "Double Room",
    description: "A comfortable double room for one or two guests, with Hotel Teesta hospitality in Darjeeling.",
    maxOccupancy: 2,
    photo: "/images/teesta-double-room.webp",
  },
  inventoryCount: 25,
};

export const ownerDecisions = [
  "Approved Mainali logo asset and brand usage",
  "Exact address, map pin, phone, WhatsApp and email",
  "Room-category names, bed layouts, capacities and photo mapping",
  "Amenities available to every room and to the property",
  "Nightly rates, taxes, inclusions and extra-person charges",
  "Full-payment or deposit policy",
  "Check-in, checkout, cancellation, refund and no-show policies",
];
