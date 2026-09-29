import { describe, expect, it } from "vitest";
import { nightsBetween, staySearchSchema } from "./stay";

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
});
