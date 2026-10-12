import { describe, expect, it } from "vitest";
import { formatHoldCountdown, remainingHoldSeconds, roomAvailability, seasonalSavings } from "./booking-presentation";

describe("genuine booking availability and savings", () => {
  it("shows the actual count and limits urgency to low inventory", () => {
    expect(roomAvailability(14)).toBe("14 rooms available for these dates");
    expect(roomAvailability(2)).toBe("Only 2 rooms left for these dates");
    expect(roomAvailability(1)).toBe("Only 1 room left for these dates");
    expect(roomAvailability(0)).toBe("Sold out for these dates");
  });
  it("does not invent savings when there is no lower seasonal rate", () => {
    expect(seasonalSavings(250_000)).toBe(0);
    expect(seasonalSavings(250_000, 250_000)).toBe(0);
    expect(seasonalSavings(300_000, 250_000)).toBe(0);
    expect(seasonalSavings(225_000, 250_000)).toBe(25_000);
  });
});

describe("payment hold deadline", () => {
  const deadline = "2026-10-20T10:15:00Z";
  it("counts from the persisted deadline instead of restarting on a return visit", () => {
    expect(remainingHoldSeconds(deadline, Date.parse("2026-10-20T10:00:00Z"))).toBe(900);
    expect(remainingHoldSeconds(deadline, Date.parse("2026-10-20T10:12:30Z"))).toBe(150);
    expect(formatHoldCountdown(150)).toBe("02:30");
  });
  it("ends the hold at its deadline and treats invalid deadlines as expired", () => {
    expect(remainingHoldSeconds(deadline, Date.parse(deadline))).toBe(0);
    expect(remainingHoldSeconds(deadline, Date.parse("2026-10-20T11:00:00Z"))).toBe(0);
    expect(remainingHoldSeconds("invalid", Date.parse(deadline))).toBe(0);
  });
});
