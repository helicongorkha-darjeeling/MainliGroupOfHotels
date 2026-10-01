import { describe, expect, it } from "vitest";
import { guestDetailsSchema, normaliseGuestPhone } from "./guest-details";
import { getTeestaRoomType, planRoomChoice } from "./room-types";

describe("guest details", () => {
  it("normalises an Indian mobile number", () => {
    expect(normaliseGuestPhone("98765 43210")).toBe("+919876543210");
  });
  it("accepts explicit international country codes", () => {
    expect(normaliseGuestPhone("+977 9812345678")).toBe("+9779812345678");
    expect(normaliseGuestPhone("0091-98765-43210")).toBe("+919876543210");
  });
  it("rejects malformed or missing contact details", () => {
    for (const phone of ["", "123", "+00000000", "phone9876543210", "+919876543210123456"]) expect(normaliseGuestPhone(phone)).toBeNull();
    expect(guestDetailsSchema.safeParse({ fullName: "", email: "invalid", phone: "9876543210" }).success).toBe(false);
  });
  it("trims and normalises guest contact details", () => {
    expect(guestDetailsSchema.parse({ fullName: " Guest Name ", email: "GUEST@example.com ", phone: "9876543210" })).toEqual({ fullName: "Guest Name", email: "guest@example.com", phone: "+919876543210" });
  });
});

describe("photo-based room choices", () => {
  it("preserves the known double-room price", () => {
    expect(planRoomChoice(getTeestaRoomType()!, 4, 1).quote?.stayTotalPaise).toBe(500_000);
  });
  it("does not reuse double-room pricing or inventory for other types", () => {
    for (const id of ["triple-room", "four-person-room", "family-room-sofa"]) {
      const room = getTeestaRoomType(id)!;
      expect(planRoomChoice(room, room.maxGuests, 2).rooms).toBe(1);
      expect(planRoomChoice(room, room.maxGuests, 2).quote).toBeNull();
      expect(room.categoryId).toBeNull();
    }
  });
  it("rejects unknown room types and invalid party sizes", () => {
    expect(getTeestaRoomType("not-a-room")).toBeUndefined();
    expect(() => planRoomChoice(getTeestaRoomType()!, 0, 2)).toThrow();
  });
});
