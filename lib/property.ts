export type PropertyPhoto = {
  src: string;
  alt: string;
  caption: string;
  category: "Rooms" | "Bathroom" | "Lobby" | "Restaurant" | "Front desk" | "Exterior";
  objectPosition?: string;
};

export const teesta = {
  name: "Hotel Teesta",
  group: "Mainali Group of Hotels",
  place: "Darjeeling",
  status: "draft" as const,
  liveBookingEnabled: false,
  summary:
    "A welcoming Darjeeling stay with comfortable double rooms for solo travellers, couples and small groups travelling together.",
  gallery: [
    { src: "/images/teesta-double-room-window.webp", alt: "Wooden double bed with a red runner beside a window at Hotel Teesta", caption: "Double room · window view", category: "Rooms", objectPosition: "50% 65%" },
    { src: "/images/teesta-room-seating.webp", alt: "Guest room with a double bed, sofa and seating at Hotel Teesta", caption: "Room with seating", category: "Rooms" },
    { src: "/images/teesta-double-room-bedside.webp", alt: "Double bed and bedside table with a kettle at Hotel Teesta", caption: "Double room · bedside view", category: "Rooms", objectPosition: "50% 65%" },
    { src: "/images/teesta-double-room-interior.webp", alt: "Wooden double bed with a red runner and chairs at Hotel Teesta", caption: "Room interior", category: "Rooms", objectPosition: "50% 65%" },
    { src: "/images/teesta-bathroom.webp", alt: "Photographed Hotel Teesta bathroom with a shower and toilet", caption: "Bathroom", category: "Bathroom" },
    { src: "/images/teesta-triple-room.webp", alt: "Two-bed triple room photographed at Hotel Teesta", caption: "Triple Room", category: "Rooms" },
    { src: "/images/teesta-four-person-room.webp", alt: "Room with two double beds at Hotel Teesta", caption: "Four-person Room", category: "Rooms" },
    { src: "/images/teesta-family-sofa-room.webp", alt: "Two-bed family room with sofa seating at Hotel Teesta", caption: "Family Room with Sofa", category: "Rooms", objectPosition: "50% 65%" },
    { src: "/images/teesta-lobby.webp", alt: "Hotel Teesta lobby seating beside large wooden windows", caption: "Lobby", category: "Lobby" },
    { src: "/images/teesta-exterior-front.webp", alt: "Front of Hotel Teesta with its hotel and restaurant sign", caption: "Hotel exterior", category: "Exterior" },
    { src: "/images/teesta-dining-room.webp", alt: "Wooden dining room with tables and chairs at Hotel Teesta", caption: "Restaurant", category: "Restaurant", objectPosition: "50% 65%" },
    { src: "/images/teesta-reception-desk.webp", alt: "Wooden reception desk and key cubbies at Hotel Teesta", caption: "Front desk", category: "Front desk" },
  ] satisfies PropertyPhoto[],
  publicRoom: {
    id: "double-room",
    name: "Double Room",
    description: "A comfortable double room for one or two guests, with Hotel Teesta hospitality in Darjeeling.",
    maxOccupancy: 2,
    photo: "/images/teesta-double-room-window.webp",
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
