import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ role: vi.fn(), gateway: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/staff-access", () => ({ readStaffRole: mocks.role, readStaffAccess: vi.fn() }));
vi.mock("@/lib/server/booking-gateway", () => ({ bookingGateway: mocks.gateway }));
import { POST as operations } from "./operations/route";
import { POST as accounts } from "./accounts/route";
import { POST as documents } from "./documents/route";
import { POST as payments } from "./payments/route";
import { POST as invoices } from "./invoices/route";
import { POST as availability } from "./availability/route";
const id = "a8570527-1bcf-4f12-aa41-fcc459a21f3f";
const request = (body: object, origin = "http://localhost:3000") => new NextRequest("http://localhost:3000/api/staff/operations", {
  method: "POST", headers: { Host: "localhost:3000", Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.role.mockResolvedValue({ user: { id }, role: "manager", error: null, status: 200 });
  mocks.gateway.mockResolvedValue({ data: { saved: true }, error: null });
});
describe("staff API permissions", () => {
  const actions = ["confirm", "cancel", "assign", "check_in", "room_check_in", "check_out", "housekeeping", "walk_in", "extend", "charge", "discount", "manual_payment", "checkin_correction", "season", "settings"];
  for (const action of actions) it(`denies housekeeping ${action} before any write`, async () => {
    mocks.role.mockResolvedValue({ user: { id }, role: "housekeeping", error: null, status: 200 });
    expect((await operations(request({ action, reservationId: id }))).status).toBe(403);
    expect(mocks.gateway).not.toHaveBeenCalled();
  });
  for (const [name, route] of [["accounts", accounts], ["documents", documents], ["payments", payments], ["invoices", invoices], ["availability", availability]] as const) it(`denies housekeeping ${name}`, async () => {
    mocks.role.mockResolvedValue({ user: { id }, role: "housekeeping", error: null, status: 200 });
    expect((await route(request({}))).status).toBe(403);
    expect(mocks.gateway).not.toHaveBeenCalled();
  });
  it("rejects cross-origin and signed-out writes", async () => {
    expect((await operations(request({}, "https://attacker.example"))).status).toBe(403);
    mocks.role.mockResolvedValue({ user: null, role: null, error: "Sign in", status: 401 });
    expect((await operations(request({}))).status).toBe(401);
    expect(mocks.gateway).not.toHaveBeenCalled();
  });
  it("rejects staff administration and manager discounts for reception", async () => {
    mocks.role.mockResolvedValue({ user: { id }, role: "reception", error: null, status: 200 });
    expect((await accounts(request({ action: "deactivate", userId: id }))).status).toBe(403);
    expect((await operations(request({ action: "discount", reservationId: id, requestId: id, description: "Approved discount", amountPaise: 100 }))).status).toBe(403);
    expect((await operations(request({ action: "check_out", reservationId: id, allowBalanceDue: true, reason: "Manager approved" }))).status).toBe(403);
    expect(mocks.gateway).not.toHaveBeenCalled();
  });
  it("preserves database denials and never reports failed checkout as saved", async () => {
    mocks.gateway.mockResolvedValue({ data: null, error: { code: "PT409", message: "Take payment before check out" } });
    const response = await operations(request({ action: "check_out", reservationId: id }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Take payment before check out" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("does not accept actor IDs, timestamps or user-editable permission claims", async () => {
    const guest = { action: "check_in", reservationId: id, fullName: "Example Guest", phone: "+919876543210", address: "Example address", nationality: "Indian", adults: 2, children: 0, idType: "passport", idNumber: "EXAMPLE1", source: "direct_website", expectedCheckOut: "2026-10-15" };
    for (const extra of [{ actor: id }, { checkedInAt: "2000-01-01T00:00:00Z" }, { role: "manager" }]) expect((await operations(request({ ...guest, ...extra }))).status).toBe(400);
    expect(mocks.gateway).not.toHaveBeenCalled();
  });
  it("retires photo uploads and registration, and denies guests before legacy reads", async () => {
    expect((await documents(request({ action: "upload", reservationId: id, side: "front", contentType: "image/jpeg", size: 100 }))).status).toBe(400);
    expect((await documents(request({ action: "register", reservationId: id, side: "front", path: `${id}/front/example.jpg` }))).status).toBe(400);
    expect((await documents(request({ action: "upload", reservationId: id, side: "front", contentType: "text/html", size: 10 }))).status).toBe(400);
    expect((await documents(request({ action: "upload", reservationId: id, side: "front", contentType: "image/jpeg", size: 6 * 1024 * 1024 }))).status).toBe(400);
    mocks.role.mockResolvedValue({ user: { id }, role: null, error: "Hotel staff access required", status: 403 });
    expect((await documents(request({ action: "read", reservationId: id, path: `${id}/front/example.jpg` }))).status).toBe(403);
    expect(mocks.gateway).not.toHaveBeenCalled();
  });
  const registration = { action: "room_check_in", requestId: id, roomNumber: "301", checkIn: "2026-10-13", checkOut: "2026-10-15", guests: 2, fullName: "Example Guest", phone: "+919876543210", address: "Example address", nationality: "Indian", adults: 2, children: 0, idType: "aadhaar", idNumber: "1234", source: "walk_in" };
  it("checks in from a room using typed identity details with no photo or existing reservation", async () => {
    mocks.role.mockResolvedValue({ user: { id }, role: "reception", error: null, status: 200 });
    mocks.gateway.mockResolvedValue({ data: { saved: true, reservationId: id, guestProfileId: id }, error: null });
    const response = await operations(request(registration));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ saved: true, data: { saved: true, reservationId: id, guestProfileId: id } });
    expect(mocks.gateway).toHaveBeenCalledWith("staff-change", { change: registration });
  });
  it.each([
    { reservationId: id }, { guestProfileId: id }, { actor: id }, { checkedInAt: "2000-01-01T00:00:00Z" },
    { checkOut: "2026-10-13" }, { checkOut: "2026-11-15" }, { guests: 3 },
    { nationality: "British" }, { source: "other" }, { advancePaise: 100 },
    { advancePaise: 100, advanceMethod: "upi_manual" },
  ])("rejects incomplete or caller-controlled room registration %#", async extra => {
    expect((await operations(request({ ...registration, ...extra }))).status).toBe(400);
    expect(mocks.gateway).not.toHaveBeenCalled();
  });
  it("returns the invoice from atomic checkout for immediate bill display", async () => {
    mocks.gateway.mockResolvedValue({ data: { saved: true, invoiceId: id, invoice: { number: "TEESTA/2026-27/000001" } }, error: null });
    const response = await operations(request({ action: "check_out", reservationId: id }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { saved: true, invoiceId: id } });
  });
});
