import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ cookies: vi.fn(), client: vi.fn(), exchange: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/server/supabase-session", () => ({ createSessionSupabaseClient: mocks.client }));
import { GET } from "./route";
import { authReturnCookieName } from "@/lib/auth-redirect";

const origin = "https://mainli-group-of-hotels.vercel.app";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookies.mockResolvedValue({ get: () => undefined });
  mocks.client.mockResolvedValue({ auth: { exchangeCodeForSession: mocks.exchange } });
  mocks.exchange.mockResolvedValue({ error: null });
});
describe("production Google callback", () => {
  it("exchanges the code and returns to the saved stay on the same production host", async () => {
    const stay = "/book?checkIn=2026-10-20&checkOut=2026-10-21&guests=3&roomType=triple-room";
    mocks.cookies.mockResolvedValue({ get: (name: string) => name === authReturnCookieName ? { value: encodeURIComponent(stay) } : undefined });
    const response = await GET(new Request(`${origin}/auth/callback?code=synthetic-code`));
    expect(mocks.exchange).toHaveBeenCalledWith("synthetic-code");
    expect(response.headers.get("location")).toBe(origin + stay);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("handles provider denial without creating a session", async () => {
    const response = await GET(new Request(`${origin}/auth/callback?error=access_denied&next=/members`));
    expect(response.headers.get("location")).toBe(`${origin}/members?auth=failed`);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("handles missing, rejected and unconfigured sign-ins", async () => {
    expect((await GET(new Request(`${origin}/auth/callback?next=/members`))).headers.get("location")).toBe(`${origin}/members?auth=failed`);
    expect(mocks.client).not.toHaveBeenCalled();
    mocks.exchange.mockResolvedValueOnce({ error: new Error("Invalid flow state") });
    expect((await GET(new Request(`${origin}/auth/callback?code=used-code&next=/members`))).headers.get("location")).toBe(`${origin}/members?auth=failed`);
    mocks.client.mockResolvedValueOnce(null);
    expect((await GET(new Request(`${origin}/auth/callback?code=synthetic-code&next=/members`))).headers.get("location")).toBe(`${origin}/members?auth=failed`);
  });
  it("supports legacy stay links while rejecting external and unapproved destinations", async () => {
    const stay = "/book?checkIn=2026-10-20&guests=2&auth=failed";
    expect((await GET(new Request(`${origin}/auth/callback?code=synthetic-code&next=${encodeURIComponent(stay)}`))).headers.get("location")).toBe(`${origin}/book?checkIn=2026-10-20&guests=2`);
    for (const next of ["https://untrusted.example", "//untrusted.example", "/staff/team"]) {
      expect((await GET(new Request(`${origin}/auth/callback?code=synthetic-code&next=${encodeURIComponent(next)}`))).headers.get("location")).toBe(`${origin}/my-bookings`);
    }
  });
  it("returns staff Google sign-in to the role-protected staff dispatcher", async () => {
    expect((await GET(new Request(`${origin}/auth/callback?code=synthetic-code&next=/staff`))).headers.get("location")).toBe(`${origin}/staff`);
  });
  it("handles configuration and exchange exceptions with a sign-in error instead of a server error", async () => {
    mocks.client.mockRejectedValueOnce(new Error("Unavailable"));
    expect((await GET(new Request(`${origin}/auth/callback?code=synthetic-code`))).headers.get("location")).toBe(`${origin}/my-bookings?auth=failed`);
    mocks.exchange.mockRejectedValueOnce(new Error("Unavailable"));
    expect((await GET(new Request(`${origin}/auth/callback?code=synthetic-code`))).headers.get("location")).toBe(`${origin}/my-bookings?auth=failed`);
  });
  it("cannot redirect to a host injected through a return cookie", async () => {
    mocks.cookies.mockResolvedValue({ get: () => ({ value: encodeURIComponent("https://untrusted.example") }) });
    const response = await GET(new Request(`${origin}/auth/callback?code=synthetic-code`));
    expect(response.headers.get("location")).toBe(`${origin}/my-bookings`);
  });
});
