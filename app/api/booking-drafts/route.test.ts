import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ createCheckoutSupabaseClient: () => ({ rpc: mocks.rpc }) }));
import { GET, POST } from "./route";

const draftId = "30000000-0000-4000-8000-000000000001";
const body = { draftId, fullName: " Test Guest ", email: "TEST@example.com", phone: "9876543210", roomType: "double-room", checkIn: "2026-10-10", checkOut: "2026-10-12", guests: 2 };
function request(overrides: Record<string, string> = {}, payload: unknown = body) {
  return new NextRequest("https://hotel.test/api/booking-drafts", {
    method: "POST", headers: { origin: "https://hotel.test", "x-checkout-request": "1", "content-type": "application/json", cookie: `teesta_checkout_session=${"a".repeat(64)}`, ...overrides }, body: JSON.stringify(payload),
  });
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_TEST_ONLY_NOT_A_REAL_KEY");
  vi.stubEnv("VERCEL", "1");
  mocks.rpc.mockReset().mockResolvedValue({ data: [{ draft_id: draftId, saved_at: "2026-10-01T12:00:00+00:00" }], error: null });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("private pre-payment draft endpoint", () => {
  it("initialises an HttpOnly session without returning contacts or a token", async () => {
    const response = await GET(new NextRequest("https://hotel.test/api/booking-drafts", { headers: { "x-checkout-request": "1" } }));
    expect(await response.json()).toEqual({ ready: true });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not replace an existing ownership cookie on retry", async () => {
    const response = await GET(new NextRequest("https://hotel.test/api/booking-drafts", { headers: { "x-checkout-request": "1", cookie: `teesta_checkout_session=${"a".repeat(64)}` } }));
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("rejects cross-origin writes and missing browser ownership", async () => {
    expect((await POST(request({ origin: "https://attacker.test" }))).status).toBe(403);
    expect((await POST(request({ cookie: "" }))).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("accepts the browser Host when Next normalizes the internal local URL", async () => {
    vi.stubEnv("VERCEL", "");
    const localRequest = new NextRequest("http://localhost:3000/api/booking-drafts", {
      method: "POST", headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "x-checkout-request": "1", "content-type": "application/json", cookie: `teesta_checkout_session=${"a".repeat(64)}` }, body: JSON.stringify(body),
    });
    expect((await POST(localRequest)).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });
  it("keeps origin, scheme, browser marker and fetch-site protections after Host handling", async () => {
    expect((await POST(request({ origin: "", host: "hotel.test" }))).status).toBe(403);
    expect((await POST(request({ "x-checkout-request": "", host: "hotel.test" }))).status).toBe(403);
    expect((await POST(request({ "sec-fetch-site": "cross-site", host: "hotel.test" }))).status).toBe(403);
    expect((await POST(request({ origin: "http://hotel.test", host: "hotel.test" }))).status).toBe(403);
    expect((await POST(request({ origin: "https://attacker.test", host: "hotel.test", "x-forwarded-host": "attacker.test" }))).status).toBe(403);
    expect((await POST(request({ origin: "http://localhost:3000", host: "127.0.0.1:3000" }))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects malformed details and privilege injection before database access", async () => {
    expect((await POST(request({}, { ...body, phone: "123" }))).status).toBe(400);
    expect((await POST(request({}, { ...body, status: "confirmed" }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("bounds the request body and only accepts JSON", async () => {
    expect((await POST(request({}, { junk: "x".repeat(9000) }))).status).toBe(413);
    expect((await POST(request({ "content-type": "text/plain" }))).status).toBe(415);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("fails closed when the server key is missing", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect((await POST(request())).status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("saves without requiring Razorpay, sign-in or a room hold", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", ""); vi.stubEnv("RAZORPAY_KEY_SECRET", ""); vi.stubEnv("CRON_SECRET", "");
    const response = await POST(request({ "x-forwarded-for": "203.0.113.7" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ saved: true, draftId, status: "draft", savedAt: "2026-10-01T12:00:00+00:00" });
    const [functionName, args] = mocks.rpc.mock.calls[0];
    expect(functionName).toBe("save_checkout_draft");
    expect(args).toMatchObject({ guest_full_name: "Test Guest", guest_email: "test@example.com", guest_phone: "+919876543210", selected_room_type: "double-room" });
    expect(args.browser_session_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(args.request_rate_key).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(args)).not.toContain("203.0.113.7");
  });
  it("returns no saved receipt or database error detail on a failed write", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST205", message: "private guest data and backend details" } });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "checkout_save_failed" });
  });
  it("rejects mismatched receipts, handles connection failure and exposes the quota safely", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ draft_id: "30000000-0000-4000-8000-000000000002", saved_at: "2026-10-01T12:00:00Z" }], error: null });
    expect((await POST(request())).status).toBe(503);
    mocks.rpc.mockRejectedValueOnce(new Error("offline"));
    expect((await POST(request())).status).toBe(503);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "PT429" } });
    expect((await POST(request())).status).toBe(429);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "PT409" } });
    expect((await POST(request())).status).toBe(409);
  });
});
