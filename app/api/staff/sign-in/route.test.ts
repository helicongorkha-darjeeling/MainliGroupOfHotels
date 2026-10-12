import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ gateway: vi.fn(), client: vi.fn(), setSession: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/booking-gateway", () => ({ bookingGateway: mocks.gateway }));
vi.mock("@/lib/server/supabase-session", () => ({ createSessionSupabaseClient: mocks.client }));
import { POST } from "./route";
const request = (body: object, origin = "http://localhost:3000") => new NextRequest("http://localhost:3000/api/staff/sign-in", { method: "POST", headers: { Host: "localhost:3000", Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks(); mocks.client.mockResolvedValue({ auth: { setSession: mocks.setSession } });
  mocks.setSession.mockResolvedValue({ error: null });
});
describe("staff sign in", () => {
  it("sets the SSR session and routes each verified role without returning tokens", async () => {
    for (const [role, destination] of [["manager", "/staff/operations"], ["reception", "/staff/operations"], ["housekeeping", "/staff/housekeeping"]]) {
      mocks.gateway.mockResolvedValue({ data: { role, session: { access_token: "test-access", refresh_token: "test-refresh" } }, error: null });
      const response = await POST(request({ username: "example", password: "example-only-test" }));
      expect(await response.json()).toEqual({ destination });
      expect(mocks.setSession).toHaveBeenCalledWith({ access_token: "test-access", refresh_token: "test-refresh" });
    }
  });
  it("rejects cross-origin requests and caller-supplied roles", async () => {
    expect((await POST(request({}, "https://attacker.example"))).status).toBe(403);
    expect((await POST(request({ username: "example", password: "example-only-test", role: "manager" }))).status).toBe(400);
    expect(mocks.gateway).not.toHaveBeenCalled();
  });
  it("uses a generic error and preserves throttling", async () => {
    mocks.gateway.mockResolvedValue({ data: null, error: { code: "PT429", message: "Sensitive provider detail" } });
    const response = await POST(request({ username: "example", password: "example-only-test" }));
    expect(response.status).toBe(429); expect(JSON.stringify(await response.json())).not.toContain("Sensitive provider");
    expect(mocks.setSession).not.toHaveBeenCalled();
  });
});
