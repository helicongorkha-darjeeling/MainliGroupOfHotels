import { expect, it } from "vitest";
import { sharedStayQuote } from "./room-price-summary";
import type { InventoryChoice } from "./reservations";
const choice = (total: number, taxConfirmed = false, bookable = true): InventoryChoice => ({ code: "double-room", name: "Double", capacity: 2, rooms: 1, availableRooms: 3, bookable, quote: { totalPaise: total, subtotalPaise: total, taxConfirmed, taxPaise: null, nights: 1, nightlyPrices: [] } });
it("shows a common total only when bookable category quotes agree", () => {
  expect(sharedStayQuote([choice(250000),choice(250000)])).toEqual({ totalPaise: 250000, taxConfirmed: false });
  expect(sharedStayQuote([choice(250000),choice(300000)])).toBeNull();
  expect(sharedStayQuote([choice(250000),choice(250000,true)])).toBeNull();
  expect(sharedStayQuote([choice(250000),choice(999999,false,false)])).toEqual({ totalPaise: 250000, taxConfirmed: false });
  expect(sharedStayQuote([])).toBeNull();
});
