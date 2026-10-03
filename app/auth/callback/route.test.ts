import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ exchange: vi.fn(), configured: true }));
vi.mock("@/lib/server/supabase-session", () => ({
  createSessionSupabaseClient: async () => (mocks.configured ? { auth: { exchangeCodeForSession: mocks.exchange } } : null),
}));
import { GET } from "./route";

async function callback(query: string) {
  const response = await GET(new Request(`https://hotel.test/auth/callback${query}`));
  return { response, location: new URL(response.headers.get("location") ?? "") };
}
beforeEach(() => {
  mocks.configured = true;
  mocks.exchange.mockReset().mockResolvedValue({ error: null });
});

describe("guest sign-in callback", () => {
  it("exchanges the code and returns to the requested guest page without a stale failure marker", async () => {
    const { response, location } = await callback("?code=valid-code&next=%2Fbook%3FcheckIn%3D2026-10-10%26guests%3D2%26auth%3Dfailed");
    expect(mocks.exchange).toHaveBeenCalledWith("valid-code");
    expect(response.status).toBe(307);
    expect(location.href).toBe("https://hotel.test/book?checkIn=2026-10-10&guests=2");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("reports cancelled, missing, rejected and thrown sign-ins as failed", async () => {
    expect((await callback("?error=access_denied&code=valid-code&next=%2Fmembers")).location.href).toBe("https://hotel.test/members?auth=failed");
    expect((await callback("?next=%2Fmembers")).location.href).toBe("https://hotel.test/members?auth=failed");
    expect(mocks.exchange).not.toHaveBeenCalled();
    mocks.exchange.mockResolvedValueOnce({ error: new Error("invalid flow state") });
    expect((await callback("?code=used-code&next=%2Fmembers")).location.href).toBe("https://hotel.test/members?auth=failed");
    mocks.exchange.mockRejectedValueOnce(new Error("network"));
    expect((await callback("?code=valid-code")).location.href).toBe("https://hotel.test/my-bookings?auth=failed");
    mocks.configured = false;
    const { response, location } = await callback("?code=valid-code&next=%2Fmembers");
    expect(location.href).toBe("https://hotel.test/members?auth=failed");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("never redirects off the site or into staff routes", async () => {
    for (const next of ["https%3A%2F%2Fevil.example%2Fmembers", "%2F%2Fevil.example", "%2Fstaff"]) {
      const { location } = await callback(`?code=valid-code&next=${next}`);
      expect(location.origin).toBe("https://hotel.test");
      expect(location.pathname).toBe("/my-bookings");
    }
  });
});
