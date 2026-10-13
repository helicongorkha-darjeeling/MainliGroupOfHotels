import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), gateway: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./booking-http", () => ({ signedInGuest: mocks.user }));
vi.mock("./booking-gateway", () => ({ bookingGateway: mocks.gateway }));
import { readStaffAccess, readStaffRole } from "./staff-access";

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
  it("preserves a password reauthentication denial for page redirects and API status", async () => {
    mocks.user.mockResolvedValue({ id: "oauth-staff", user_metadata: { amr: [{ method: "password" }] } });
    mocks.gateway.mockResolvedValue({ data: null, error: { code: "PT401", message: "Sign in with your staff username and password to continue." } });
    expect(await readStaffAccess()).toMatchObject({ data: null, errorCode: "PT401" });
    expect(await readStaffRole()).toMatchObject({ role: null, status: 401 });
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
  it("never serializes guest details or invoices into a housekeeping response", async () => {
    mocks.user.mockResolvedValue({ id: "housekeeper" });
    mocks.gateway.mockResolvedValue({ error: null, data: { role: "housekeeping", staffCoreReady: true,
      reservations: [{ full_name: "Private guest", phone: "Private phone" }], invoices: ["Private invoice"],
      guestProfiles: [{ full_name: "Private guest", id_number: "Private ID", passport_number: "Private passport", visa_number: "Private visa" }],
      rooms: [{ number: "301", category: "double-room", active: true, housekeeping: "dirty", occupancy: "vacant", guest_name: "Private guest", reservation_id: "Private stay", checked_in_at: "Private time" }],
    } });
    const { data } = await readStaffAccess();
    expect(data).toEqual({ role: "housekeeping", staffCoreReady: true, rooms: [{ number: "301", category: "double-room", name: undefined, active: true, housekeeping: "dirty", occupancy: "vacant" }] });
    expect(JSON.stringify(data)).not.toContain("Private");
  });
  it("uses a fresh gateway role check and ignores browser metadata", async () => {
    mocks.user.mockResolvedValue({ id: "staff", user_metadata: { role: "manager" } });
    mocks.gateway.mockResolvedValue({ data: { role: "housekeeping" }, error: null });
    expect((await readStaffRole()).role).toBe("housekeeping");
    expect(mocks.gateway).toHaveBeenCalledWith("staff-role");
    mocks.gateway.mockResolvedValue({ data: null, error: { message: "Inactive account", code: "PT403" } });
    expect((await readStaffRole()).status).toBe(403);
  });
});
