export const teestaRates = {
  singleOccupancyPaise: 250_000,
  doubleOccupancyPaise: 250_000,
  currency: "INR",
} as const;

export type StayQuote = {
  guests: number;
  nights: number;
  rooms: number;
  doubleOccupancyRooms: number;
  singleOccupancyRooms: number;
  nightlyTotalPaise: number;
  stayTotalPaise: number;
};

export function quoteTeestaStay(guests: number, nights: number): StayQuote {
  if (!Number.isInteger(guests) || guests < 1) {
    throw new Error("Guest count must be a positive whole number.");
  }
  if (!Number.isInteger(nights) || nights < 1) {
    throw new Error("Night count must be a positive whole number.");
  }

  const doubleOccupancyRooms = Math.floor(guests / 2);
  const singleOccupancyRooms = guests % 2;
  const rooms = doubleOccupancyRooms + singleOccupancyRooms;
  const nightlyTotalPaise =
    doubleOccupancyRooms * teestaRates.doubleOccupancyPaise +
    singleOccupancyRooms * teestaRates.singleOccupancyPaise;

  return {
    guests,
    nights,
    rooms,
    doubleOccupancyRooms,
    singleOccupancyRooms,
    nightlyTotalPaise,
    stayTotalPaise: nightlyTotalPaise * nights,
  };
}

export function formatInr(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: teestaRates.currency,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function describeRoomSplit(quote: StayQuote) {
  return `${quote.rooms} double ${quote.rooms === 1 ? "room" : "rooms"}`;
}
