import { describe, expect, it, vi } from "vitest";
import { handleStaffAction, paymentReviewNotice, publicInvoice, recordBalanceWebhook, sha256, staffActionAllowed, staffLogin, validPhotoPath, type StaffDependencies, type StaffRole } from "./staff";

const actor = "11111111-1111-4111-8111-111111111111";
const reservation = "22222222-2222-4222-8222-222222222222";
const request = "33333333-3333-4333-8333-333333333333";
const photo = `${reservation}/${actor}/${request}.front.jpg`;
const reply = (body: unknown, status = 200) => Response.json(body, { status });
function dependencies(role: StaffRole = "manager") {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), single: vi.fn() };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  const bucket = { createSignedUploadUrl: vi.fn(), info: vi.fn(), createSignedUrl: vi.fn() };
  const mock = { rpc: vi.fn(), from: vi.fn().mockReturnValue(query), storage: { from: vi.fn().mockReturnValue(bucket) }, auth: { admin: { createUser: vi.fn(), updateUserById: vi.fn(), deleteUser: vi.fn() } } };
  const deps: StaffDependencies = { db: mock as unknown as StaffDependencies["db"], user: { id: actor }, role, env: () => undefined, provider: vi.fn(), reply };
  return { deps, mock, query, bucket };
}
const writes = ["confirm", "cancel", "check_in", "check_out", "assign", "housekeeping", "walk_in", "extend", "charge", "discount", "manual_payment", "checkin_correction", "allow_balance_due", "settings", "season", "id_photo", "invoice", "invoice_share", "invoice_revoke"];

describe("staff gateway role enforcement", () => {
  it.each(writes)("housekeeping receives 403 for database write %s", async action => {
    const { deps, mock } = dependencies("housekeeping");
    const response = await handleStaffAction({ action: "staff-change", change: { action } }, deps);
    expect(response.status).toBe(403);
    expect(mock.rpc).not.toHaveBeenCalled(); expect(mock.from).not.toHaveBeenCalled();
    expect(deps.provider).not.toHaveBeenCalled();
  });
  it.each(["staff-account", "staff-id-upload", "staff-id-register", "staff-id-read", "staff-balance-payment", "staff-invoice", "staff-availability", "reserve", "cancel", "order", "verify", "unexpected-new-write"])("housekeeping receives 403 for gateway action %s", async action => {
    const { deps, mock } = dependencies("housekeeping");
    expect((await handleStaffAction({ action }, deps)).status).toBe(403);
    expect(mock.rpc).not.toHaveBeenCalled(); expect(mock.storage.from).not.toHaveBeenCalled();
    expect(mock.auth.admin.createUser).not.toHaveBeenCalled(); expect(mock.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
  it.each(["discount", "settings", "season", "checkin_correction", "allow_balance_due"])("reception cannot perform manager action %s", async action => {
    const { deps, mock } = dependencies("reception");
    expect((await handleStaffAction({ action: "staff-change", change: { action } }, deps)).status).toBe(403);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("reception cannot create or reset staff accounts", async () => {
    const { deps, mock } = dependencies("reception");
    for (const action of ["create", "reset", "deactivate"]) expect((await handleStaffAction({ action: "staff-account", change: { action } }, deps)).status).toBe(403);
    expect(mock.auth.admin.createUser).not.toHaveBeenCalled();
  });
  it("housekeeping snapshot strips identity, finance, assignments and unexpected room properties", async () => {
    const { deps, mock } = dependencies("housekeeping");
    mock.rpc.mockResolvedValue({ data: { rooms: [{ number: "301", category: "double-room", name: "Double Room", active: true, housekeeping: "dirty", occupancy: "vacant", full_name: "Private guest", email: "guest@example.test", paid_paise: 200000 }], reservations: [{ full_name: "Private guest" }], staffMembers: [{ name: "Staff member" }] }, error: null });
    const data = (await (await handleStaffAction({ action: "staff" }, deps)).json()).data;
    expect(data).toEqual({ role: "housekeeping", staffCoreReady: true, rooms: [{ number: "301", category: "double-room", name: "Double Room", active: true, housekeeping: "dirty", occupancy: "vacant" }] });
  });
  it("forwards the verified actor to every database write and respects database 403", async () => {
    const { deps, mock } = dependencies("reception");
    mock.rpc.mockResolvedValue({ data: null, error: { code: "PT403", message: "Staff access required" } });
    const response = await handleStaffAction({ action: "staff-change", change: { action: "check_in", reservationId: reservation, actor: "forged-user", checkInAt: "2000-01-01" } }, deps);
    expect(response.status).toBe(403);
    expect(mock.rpc).toHaveBeenCalledWith("hotel_staff_change", { actor, change: { action: "check_in", reservationId: reservation, actor: "forged-user", checkInAt: "2000-01-01" } });
  });
  it("fails closed for unknown or user supplied role claims", () => {
    expect(staffActionAllowed("reception", "staff-change", { action: "discount", role: "manager" })).toBe(false);
    expect(staffActionAllowed("manager", "staff-change", { action: "new_write" })).toBe(false);
  });
});

describe("username password login", () => {
  it("throttles before any Auth request, independent of caller IP headers", async () => {
    const { deps, mock } = dependencies();
    mock.rpc.mockResolvedValue({ data: { allowed: false }, error: null });
    const signIn = vi.fn();
    const response = await staffLogin({ action: "staff-login", username: "FrontDesk", password: "only-a-unit-test", forwardedIp: "spoofed" }, { ...deps, signIn });
    expect(response.status).toBe(429); expect(signIn).not.toHaveBeenCalled(); expect(mock.from).not.toHaveBeenCalled();
    expect(mock.rpc).toHaveBeenCalledWith("hotel_staff_login_attempt", { identifier_hash: await sha256("frontdesk"), network_hash: await sha256("mainali-staff-login-global") });
  });
  it("returns only the verified active role and session token fields", async () => {
    const { deps, mock, query } = dependencies();
    mock.rpc.mockResolvedValue({ data: { allowed: true }, error: null });
    query.maybeSingle.mockResolvedValueOnce({ data: { user_id: actor, role: "housekeeping", auth_email: "internal@staff.mainali.invalid" }, error: null }).mockResolvedValueOnce({ data: { role: "housekeeping" }, error: null });
    const signIn = vi.fn().mockResolvedValue({ userId: actor, session: { access_token: "unit-test-access", refresh_token: "unit-test-refresh", expires_at: 1791800000, user: { email: "private" } } });
    const result = await (await staffLogin({ action: "staff-login", username: "cleaner", password: "only-a-unit-test", role: "manager" }, { ...deps, signIn })).json();
    expect(result).toEqual({ data: { role: "housekeeping", session: { access_token: "unit-test-access", refresh_token: "unit-test-refresh", expires_at: 1791800000 } } });
  });
  it("rejects account deactivation during sign-in without returning tokens", async () => {
    const { deps, mock, query } = dependencies();
    mock.rpc.mockResolvedValue({ data: { allowed: true }, error: null });
    query.maybeSingle.mockResolvedValueOnce({ data: { user_id: actor, role: "reception", auth_email: "internal@staff.mainali.invalid" }, error: null }).mockResolvedValueOnce({ data: null, error: null });
    const signIn = vi.fn().mockResolvedValue({ userId: actor, session: { access_token: "unit-test-access", refresh_token: "unit-test-refresh" } });
    const response = await staffLogin({ action: "staff-login", username: "desk", password: "only-a-unit-test" }, { ...deps, signIn });
    expect(response.status).toBe(401); expect(JSON.stringify(await response.json())).not.toContain("unit-test-access");
  });
  it("removes only a newly created Auth account if staff save is rejected", async () => {
    const { deps, mock, query } = dependencies();
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    mock.auth.admin.createUser.mockResolvedValue({ data: { user: { id: request } }, error: null });
    mock.rpc.mockResolvedValueOnce({ data: "manager", error: null }).mockResolvedValueOnce({ data: null, error: { code: "PT409", message: "Username already exists" } });
    expect((await handleStaffAction({ action: "staff-account", change: { action: "create", username: "cleaner", name: "Test cleaner", role: "housekeeping", password: "unit-test-staff-password" } }, deps)).status).toBe(409);
    expect(mock.auth.admin.deleteUser).toHaveBeenCalledWith(request);
    const authInput = mock.auth.admin.createUser.mock.calls[0][0];
    expect(authInput.user_metadata).toEqual({ full_name: "Test cleaner" });
    expect(authInput.email).toMatch(/@staff\.mainali\.invalid$/);
    expect(JSON.stringify(mock.rpc.mock.calls)).not.toContain("unit-test-staff-password");
  });
  it("rechecks manager access immediately before calling external Auth password reset", async () => {
    const { deps, mock, query } = dependencies();
    query.maybeSingle.mockResolvedValue({ data: { user_id: request }, error: null });
    mock.rpc.mockResolvedValue({ data: null, error: { code: "PT403", message: "Active hotel staff access required" } });
    expect((await handleStaffAction({ action: "staff-account", change: { action: "reset", userId: request, password: "unit-test-staff-password" } }, deps)).status).toBe(403);
    expect(mock.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
});

describe("private identification photographs", () => {
  it("rejects traversal, a different stay and unapproved extensions", () => {
    expect(validPhotoPath(photo, reservation, "front")).toBe(true);
    for (const path of [photo.replace(reservation, request), `../${photo}`, photo.replace(".jpg", ".svg"), photo.replace(".front.", ".back.")]) expect(validPhotoPath(path, reservation, "front")).toBe(false);
  });
  it.each([{ contentType: "image/svg+xml", size: 100 }, { contentType: "image/png", size: 5 * 1024 * 1024 + 1 }, { contentType: "image/jpeg", size: 0 }])("rejects invalid upload constraints %#", async details => {
    const { deps, mock, bucket } = dependencies("reception");
    mock.rpc.mockResolvedValue({ data: { paths: [] }, error: null });
    expect((await handleStaffAction({ action: "staff-id-upload", reservationId: reservation, side: "front", ...details }, deps)).status).toBe(400);
    expect(bucket.createSignedUploadUrl).not.toHaveBeenCalled();
  });
  it("a signed read requires the path registered on that authorized stay", async () => {
    const { deps, mock, bucket } = dependencies("reception");
    mock.rpc.mockResolvedValue({ data: { paths: [] }, error: null });
    expect((await handleStaffAction({ action: "staff-id-read", reservationId: reservation, path: photo }, deps)).status).toBe(404);
    expect(bucket.createSignedUrl).not.toHaveBeenCalled();
    mock.rpc.mockResolvedValue({ data: { paths: [photo] }, error: null });
    bucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://example.test/private" }, error: null });
    expect((await handleStaffAction({ action: "staff-id-read", reservationId: reservation, path: photo }, deps)).status).toBe(200);
    expect(bucket.createSignedUrl).toHaveBeenCalledWith(photo, 60);
  });
});

describe("balance payments and invoice sharing", () => {
  const testEnv = (name: string) => ({ RAZORPAY_KEY_ID: "rzp_test_unit", RAZORPAY_KEY_SECRET: "unit-provider-secret", RAZORPAY_WEBHOOK_SECRET: "unit-webhook-secret", RAZORPAY_MODE: "test" } as Record<string, string>)[name];
  it.each(["confirmed", "checked_in", "checked_out"])("payment review email preserves a %s stay's confirmation", status => {
    const message = paymentReviewNotice(status);
    expect(message).toContain("captured payment needs front-desk review");
    expect(message).toContain("Do not pay again");
    expect(message).not.toContain("not confirmed");
  });
  it("a late expired-hold capture email explicitly says the reservation is unconfirmed", () => {
    expect(paymentReviewNotice("payment_review")).toContain("Your booking is not confirmed");
  });
  it("does not create a live provider payment or change balances", async () => {
    const { deps, mock } = dependencies();
    deps.env = name => name === "RAZORPAY_MODE" ? "live" : testEnv(name);
    expect((await handleStaffAction({ action: "staff-balance-payment", reservationId: reservation, kind: "link", requestId: request }, deps)).status).toBe(503);
    expect(mock.rpc).not.toHaveBeenCalled(); expect(deps.provider).not.toHaveBeenCalled();
  });
  it("creating a payment link never records a payment; uses saved amount and disables unsolicited notifications", async () => {
    const { deps, mock } = dependencies("reception");
    deps.env = testEnv;
    mock.rpc.mockResolvedValueOnce({ data: { id: request, amount_paise: 120000 }, error: null }).mockResolvedValueOnce({ data: { details: { url: "https://rzp.io/test", kind: "link" } }, error: null });
    const provider = vi.fn().mockResolvedValue({ id: "plink_unit", short_url: "https://rzp.io/test" }); deps.provider = provider;
    expect((await handleStaffAction({ action: "staff-balance-payment", reservationId: reservation, kind: "link", requestId: request, amountPaise: 1 }, deps)).status).toBe(200);
    const body = JSON.parse(provider.mock.calls[0][1].body);
    expect(body.amount).toBe(120000); expect(body.notify).toEqual({ sms: false, email: false }); expect(body.reminder_enable).toBe(false);
    expect(mock.rpc.mock.calls.map(c => c[0])).toEqual(["hotel_staff_balance_request", "hotel_staff_balance_attach"]);
  });
  it("only a fetched captured INR payment belonging to the paid link reaches the ledger", async () => {
    const { deps, mock } = dependencies(); deps.env = testEnv;
    const provider = vi.fn().mockResolvedValueOnce({ status: "captured", currency: "INR", amount: 120000, order_id: "order_unit", amount_refunded: 0 }).mockResolvedValueOnce({ currency: "INR", status: "paid", amount: 120000, order_id: "order_unit" }); deps.provider = provider;
    mock.rpc.mockResolvedValue({ data: { saved: true }, error: null });
    const event = { event: "payment_link.paid", payload: { payment_link: { entity: { id: "plink_unit" } }, payment: { entity: { id: "pay_unit", amount: 1 } } } };
    expect(await recordBalanceWebhook(event, deps)).toBe(true);
    expect(mock.rpc).toHaveBeenCalledWith("hotel_staff_record_balance_payment", { provider_request: "plink_unit", payment_id: "pay_unit", amount: 120000 });
  });
  it("a captured payment for a different link order cannot reach the ledger", async () => {
    const { deps, mock } = dependencies(); deps.env = testEnv;
    deps.provider = vi.fn().mockResolvedValueOnce({ status: "captured", currency: "INR", amount: 120000, order_id: "order_other" }).mockResolvedValueOnce({ currency: "INR", status: "paid", amount: 120000, order_id: "order_unit" });
    await expect(recordBalanceWebhook({ event: "payment_link.paid", payload: { payment_link: { entity: { id: "plink_unit" } }, payment: { entity: { id: "pay_unit" } } } }, deps)).rejects.toThrow("payment_mismatch");
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("public invoice lookup accepts an opaque token and hashes it before SQL", async () => {
    const { deps, mock } = dependencies(); mock.rpc.mockResolvedValue({ data: { invoiceNumber: "MH/2026-27/0001", guestName: "Test guest" }, error: null });
    expect((await publicInvoice({ action: "invoice-public", token: reservation }, deps)).status).toBe(404); expect(mock.rpc).not.toHaveBeenCalled();
    const token = "a".repeat(64);
    expect((await publicInvoice({ action: "invoice-public", token }, deps)).status).toBe(200);
    expect(mock.rpc).toHaveBeenCalledWith("hotel_invoice_public", { token_hash: await sha256(token) });
  });
});
