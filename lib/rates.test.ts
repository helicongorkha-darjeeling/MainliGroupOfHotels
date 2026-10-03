import { describe, expect, it } from "vitest";
import { describeRoomSplit, quoteTeestaStay } from "./rates";

describe("Hotel Teesta room quote", () => {
  it("quotes one guest at the same Double Room rate", () => {
    expect(quoteTeestaStay(1, 2)).toMatchObject({
      rooms: 1,
      singleOccupancyRooms: 1,
      nightlyTotalPaise: 250_000,
      stayTotalPaise: 500_000,
    });
  });

  it("quotes two guests in one double room", () => {
    expect(quoteTeestaStay(2, 3)).toMatchObject({
      rooms: 1,
      doubleOccupancyRooms: 1,
      nightlyTotalPaise: 250_000,
      stayTotalPaise: 750_000,
    });
  });

  it("quotes two Double Rooms for an odd-numbered party", () => {
    const quote = quoteTeestaStay(3, 1);
    expect(quote.stayTotalPaise).toBe(500_000);
    expect(describeRoomSplit(quote)).toBe("2 double rooms");
  });

  it("rejects invalid quote input", () => {
    expect(() => quoteTeestaStay(0, 1)).toThrow();
    expect(() => quoteTeestaStay(2, 0)).toThrow();
  });
});
