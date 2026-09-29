import { describe, expect, it } from "vitest";
import { describeRoomSplit, quoteTeestaStay } from "./rates";

describe("Hotel Teesta room quote", () => {
  it("quotes one guest at the single-occupancy rate", () => {
    expect(quoteTeestaStay(1, 2)).toMatchObject({
      rooms: 1,
      singleOccupancyRooms: 1,
      nightlyTotalPaise: 150_000,
      stayTotalPaise: 300_000,
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

  it("adds a single room for an odd-numbered party", () => {
    const quote = quoteTeestaStay(3, 1);
    expect(quote.stayTotalPaise).toBe(400_000);
    expect(describeRoomSplit(quote)).toBe("1 double-occupancy room + 1 single-occupancy room");
  });

  it("rejects invalid quote input", () => {
    expect(() => quoteTeestaStay(0, 1)).toThrow();
    expect(() => quoteTeestaStay(2, 0)).toThrow();
  });
});
