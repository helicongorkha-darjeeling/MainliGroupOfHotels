import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), gateway: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./booking-http", () => ({ signedInGuest: mocks.user }));
vi.mock("./booking-gateway", () => ({ bookingGateway: mocks.gateway }));
import { readStaffAccess } from "./staff-access";

beforeEach(() => { vi.clearAllMocks(); });
describe("admin dashboard access", () => {
  it("does not fetch private data for signed-out visitors", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await readStaffAccess()).data).toBeNull();
    expect(mocks.gateway).not.toHaveBeenCalled();
  });
  it("ignores user-editable roles and honours the gateway denial", async () => {
    mocks.user.mockResolvedValue({ id: "guest", user_metadata: { role: "manager" } });
    mocks.gateway.mockResolvedValue({ data: null, error: { message: "Hotel staff access required." } });
    expect((await readStaffAccess()).data).toBeNull();
  });
  it("fails closed for missing or unexpected staff roles", async () => {
    mocks.user.mockResolvedValue({ id: "guest" });
    for (const data of [null, { role: "admin" }, { role: "guest" }]) {
      mocks.gateway.mockResolvedValue({ data, error: null });
      expect((await readStaffAccess()).data).toBeNull();
    }
  });
  it("returns operations only for a role verified by Supabase", async () => {
    mocks.user.mockResolvedValue({ id: "staff" });
    for (const role of ["manager", "reception"]) {
      const data = { role, rooms: [] };
      mocks.gateway.mockResolvedValue({ data, error: null });
      expect((await readStaffAccess()).data).toBe(data);
    }
  });
});
