import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ user: vi.fn(), update: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/server/supabase-session", () => ({ createSessionSupabaseClient: mocks.client }));
vi.mock("@/lib/server/booking-http", async () => {
  const { NextResponse } = await import("next/server");
  return {
    bookingOrigin: (r: NextRequest) => r.headers.get("origin") === "http://localhost:3000",
    smallJson: (r: NextRequest) => r.json(),
    bookingResponse: (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
  };
});
import { POST } from "./route";
const details = { fullName: "Test Guest", email: "test@example.com", phone: "9876543210" };
const request = (body: object = details, origin = "http://localhost:3000") => new NextRequest("http://localhost:3000/api/guest-contact", {
  method: "POST", headers: { Host: "localhost:3000", Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.mockResolvedValue({ auth: { getUser: mocks.user, updateUser: mocks.update } });
  mocks.user.mockResolvedValue({ data: { user: { id: "guest-id", email: details.email, email_confirmed_at: "2026-10-01T00:00:00Z" } }, error: null });
  mocks.update.mockResolvedValue({ data: { user: { id: "guest-id" } }, error: null });
});
describe("guest contact before payment", () => {
  it("saves only normalized contact metadata without changing verified email or auth phone", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ saved: true });
    expect(mocks.update).toHaveBeenCalledWith({ data: { full_name: "Test Guest", booking_contact_phone: "+919876543210" } });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("rejects cross-origin and unsigned requests", async () => {
    expect((await POST(request(details, "https://untrusted.example"))).status).toBe(403);
    mocks.user.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request())).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects another email and forged authorization metadata", async () => {
    expect((await POST(request({ ...details, email: "other@example.com" }))).status).toBe(403);
    expect((await POST(request({ ...details, role: "manager", phone_confirmed_at: "now" }))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects invalid phone numbers and never reports a failed save as successful", async () => {
    expect((await POST(request({ ...details, phone: "invalid" }))).status).toBe(400);
    mocks.update.mockResolvedValue({ data: { user: null }, error: { message: "provider unavailable" } });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty("saved");
  });
});
