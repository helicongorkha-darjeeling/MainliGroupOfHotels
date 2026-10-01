import { describeRoomSplit, quoteTeestaStay } from "./rates";

// Owner's renamed photos define the display choices, not database inventory.
// New layouts deliberately have no payable rate or category mapping yet.
export const teestaRoomTypes = [
  { id: "double-room", name: "Double Room", maxGuests: 2, description: "One double bed for a solo stay or two guests.", photo: "/images/teesta-double-room-window.webp", position: "50% 65%", categoryId: "10000000-0000-4000-8000-000000000001" },
  { id: "triple-room", name: "Triple Room", maxGuests: 3, description: "A two-bed layout for three guests.", photo: "/images/teesta-triple-room.webp", position: "50% 60%", categoryId: null },
  { id: "four-person-room", name: "Four-person Room", maxGuests: 4, description: "Two double beds for a family or group of four.", photo: "/images/teesta-four-person-room.webp", position: "50% 65%", categoryId: null },
  { id: "family-room-sofa", name: "Family Room with Sofa", maxGuests: 6, description: "Two beds and sofa seating for a larger family or group.", photo: "/images/teesta-family-sofa-room.webp", position: "50% 65%", categoryId: null },
] as const;

export type TeestaRoomType = (typeof teestaRoomTypes)[number];

export function getTeestaRoomType(id = "double-room") {
  return teestaRoomTypes.find((room) => room.id === id);
}

export function planRoomChoice(room: TeestaRoomType, guests: number, nights: number) {
  if (!Number.isInteger(guests) || guests < 1 || guests > 12 || !Number.isInteger(nights) || nights < 1) throw new Error("Invalid stay details.");
  const rooms = Math.ceil(guests / room.maxGuests);
  const quote = room.id === "double-room" ? quoteTeestaStay(guests, nights) : null;
  return { rooms, quote, description: quote ? describeRoomSplit(quote) : `${rooms} ${room.name.toLowerCase()}${rooms === 1 ? "" : "s"}` };
}
