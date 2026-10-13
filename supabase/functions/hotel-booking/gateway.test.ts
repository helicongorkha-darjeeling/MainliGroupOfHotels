import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import * as staffGateway from "./staff";

// Run the actual Deno request handler with controlled Auth, Database and environment
// dependencies. No hosted credentials, network calls or production data are used.
const compiled = ts.transpileModule(readFileSync(new URL("./index.ts", import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
function gateway(role: string | null, verified = true, method = "password") {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.maybeSingle.mockResolvedValue({ data: role ? { role } : null, error: null });
  const db = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: verified ? { id: "11111111-1111-4111-8111-111111111111", email: "staff@example.test", email_confirmed_at: "2026-01-01", user_metadata: { role: "manager", amr: [{ method: "password" }] } } : null }, error: null }), getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "11111111-1111-4111-8111-111111111111", amr: [{ method }] } }, error: null }) }, from: vi.fn().mockReturnValue(query), rpc: vi.fn() };
  let handler: (req: Request) => Promise<Response> = () => Promise.resolve(Response.json({ error: "Handler not registered" }, { status: 500 }));
  const deno = { env: { get: (name: string) => name === "SUPABASE_URL" ? "https://unit-test.supabase.test" : name === "SUPABASE_SERVICE_ROLE_KEY" ? "unit-test-service-only" : undefined }, serve: (fn: typeof handler) => { handler = fn; } };
  const requireModule = (name: string) => name.startsWith("npm:@supabase/") ? { createClient: () => db } : name === "./staff.ts" ? staffGateway : (() => { throw new Error(`Unexpected test import: ${name}`); })();
  new Function("require", "exports", "Deno", compiled)(requireModule, {}, deno);
  return { handler, db, query };
}
const privateWrites = [
  ...["confirm", "cancel", "check_in", "room_check_in", "check_out", "assign", "housekeeping", "walk_in", "extend", "charge", "discount", "manual_payment", "checkin_correction", "allow_balance_due", "settings", "season", "id_photo", "invoice", "invoice_share", "invoice_revoke"].map(action => ({ action: "staff-change", change: { action } })),
  ...["staff-account", "staff-id-upload", "staff-id-register", "staff-id-read", "staff-balance-payment", "staff-invoice", "staff-availability", "reserve", "cancel", "order", "verify", "unknown-write"].map(action => ({ action })),
];
function request(input: unknown, signedIn = true) {
  return new Request("https://unit-test.supabase.test/functions/v1/hotel-booking", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://mainli-group-of-hotels.vercel.app", ...(signedIn ? { Authorization: "Bearer unit-test-access" } : {}) }, body: JSON.stringify(input) });
}
describe("actual Edge API authorization", () => {
  it.each(privateWrites)("housekeeping gets 403 before every write $action $change.action", async input => {
    const { handler, db } = gateway("housekeeping");
    const response = await handler(request(input));
    expect(response.status).toBe(403); expect(db.rpc).not.toHaveBeenCalled();
    expect(db.auth.getUser).toHaveBeenCalledWith("unit-test-access");
    expect(db.from.mock.calls).toEqual([["hotel_staff"]]);
  });
  it.each(["staff", "staff-role", "staff-id-upload", "staff-id-read", "staff-account", "staff-balance-payment", "staff-invoice"])("a verified guest cannot access private staff action %s", async action => {
    const { handler, db } = gateway(null);
    expect((await handler(request({ action }))).status).toBe(403); expect(db.rpc).not.toHaveBeenCalled();
  });
  it.each(["staff", "staff-change", "staff-id-read", "staff-account"])("anonymous action %s is rejected before lookup", async action => {
    const { handler, db } = gateway(null, false);
    expect((await handler(request({ action }, false))).status).toBe(401); expect(db.from).not.toHaveBeenCalled(); expect(db.rpc).not.toHaveBeenCalled();
  });
  it("does not authorize a guest's editable manager metadata", async () => {
    const { handler, db } = gateway(null);
    expect((await handler(request({ action: "staff-change", change: { action: "settings" }, role: "manager" }))).status).toBe(403);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it.each(["staff-role", "staff", "housekeeping", "staff-change", "staff-account", "staff-invoice", "staff-id-read"])("an OAuth staff session cannot perform %s even with editable password claims", async action => {
    const { handler, db } = gateway("manager", true, "oauth");
    const response = await handler(request({ action, change: { action: "room_check_in" }, amr: [{ method: "password" }] }));
    expect(response.status).toBe(401); expect((await response.json()).error).toContain("username and password");
    expect(db.from).not.toHaveBeenCalled(); expect(db.rpc).not.toHaveBeenCalled();
    expect(db.auth.getClaims).toHaveBeenCalledWith("unit-test-access");
  });
  it("does not use failed signature verification for staff access", async () => {
    const { handler, db } = gateway("manager");
    db.auth.getClaims.mockResolvedValue({ data: null, error: new Error("Invalid signature") });
    expect((await handler(request({ action: "staff-role" }))).status).toBe(401);
    expect(db.from).not.toHaveBeenCalled();
  });
  it("requires claims to belong to the freshly verified user", async () => {
    const { handler, db } = gateway("manager");
    db.auth.getClaims.mockResolvedValue({ data: { claims: { sub: "22222222-2222-4222-8222-222222222222", amr: [{ method: "password" }] } }, error: null });
    const response = await handler(request({ action: "staff-role" }));
    expect(response.status).toBe(401); expect(await response.json()).toMatchObject({ code: "PT401" });
    expect(db.from).not.toHaveBeenCalled();
  });
  it("accepts active staff password sessions after both token and user verification", async () => {
    const { handler, db } = gateway("manager");
    const response = await handler(request({ action: "staff-role" }));
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ data: { role: "manager" } });
    expect(db.auth.getUser).toHaveBeenCalledWith("unit-test-access");
    expect(db.auth.getClaims).toHaveBeenCalledWith("unit-test-access");
  });
  it("keeps guest checkout authentication independent of the staff password requirement", async () => {
    const { handler, db } = gateway(null, true, "oauth");
    db.rpc.mockResolvedValue({ data: { reference: "TEESTA-EXAMPLE" }, error: null });
    const response = await handler(request({ action: "reserve", args: { guest_email: "staff@example.test" } }));
    expect(response.status).toBe(200); expect((await response.json()).data.reference).toBe("TEESTA-EXAMPLE");
    expect(db.rpc).toHaveBeenCalledWith("hotel_reserve", expect.objectContaining({ guest_email: "staff@example.test", guest_user: "11111111-1111-4111-8111-111111111111" }));
    expect(db.auth.getClaims).not.toHaveBeenCalled();
  });
  it("rejects an unapproved browser origin before Auth validation", async () => {
    const { handler, db } = gateway("manager");
    const req = new Request("https://unit-test.supabase.test/functions/v1/hotel-booking", { method: "POST", headers: { Origin: "https://other.example.test" }, body: JSON.stringify({ action: "staff-role" }) });
    expect((await handler(req)).status).toBe(403); expect(db.auth.getUser).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON before Auth or data access", async () => {
    const { handler, db } = gateway("manager");
    const req = new Request("https://unit-test.supabase.test/functions/v1/hotel-booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{not-json}" });
    expect((await handler(req)).status).toBe(400); expect(db.auth.getUser).not.toHaveBeenCalled(); expect(db.rpc).not.toHaveBeenCalled();
  });
});
