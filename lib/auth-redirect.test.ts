import { describe, expect, it } from "vitest";
import { authCallbackUrl, safeAuthDestination } from "./auth-redirect";

const origin = "https://mainli-group-of-hotels.vercel.app";
describe("guest auth redirects", () => {
  it("keeps guest destinations and stay parameters", () => {
    for (const destination of ["/members", "/my-bookings", "/book?checkIn=2026-10-10&guests=2"]) {
      expect(safeAuthDestination(destination, origin)).toBe(destination);
    }
  });
  it("rejects external, staff and malformed destinations", () => {
    for (const destination of [null, "", "https://evil.example/my-bookings", "//evil.example/my-bookings", "/\\evil.example/my-bookings", "/staff", "/auth/callback", "/members\n", "/%5c%5cevil.example/my-bookings", "/%2F%2Fevil.example", "/members/../staff", "/MEMBERS", "/members/", "/members" + "x".repeat(2048)]) {
      expect(safeAuthDestination(destination, origin)).toBe("/my-bookings");
    }
  });
  it("drops fragments and never places a next path in the callback host", () => {
    expect(safeAuthDestination("/members#fragment", origin)).toBe("/members");
    const callback = new URL(authCallbackUrl(origin, "//evil.example/my-bookings"));
    expect(callback.origin).toBe(origin);
    expect(callback.pathname).toBe("/auth/callback");
    expect(callback.searchParams.get("next")).toBe("/my-bookings");
  });
});
