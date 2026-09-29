import { describe, expect, it } from "vitest";
import { addHotelDays, hotelToday, nightsBetween, staySearchSchema } from "./stay";

describe("hotel stay dates", () => {
  it("counts checkout as an exclusive date", () => {
    expect(nightsBetween("2026-10-01", "2026-10-04")).toBe(3);
  });

  it("rejects a checkout that is not after check-in", () => {
    const result = staySearchSchema.safeParse({
      checkIn: "2026-10-04",
      checkOut: "2026-10-04",
      guests: 2,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid guest count and date range", () => {
    const result = staySearchSchema.safeParse({
      checkIn: "2026-10-01",
      checkOut: "2026-10-02",
      guests: "2",
    });
    expect(result.success).toBe(true);
  });

  it("uses the hotel timezone for today's booking date", () => {
    expect(hotelToday(new Date("2026-09-29T20:00:00.000Z"))).toBe("2026-09-30");
  });

  it("moves checkout across month boundaries", () => {
    expect(addHotelDays("2026-09-30", 1)).toBe("2026-10-01");
  });
});
