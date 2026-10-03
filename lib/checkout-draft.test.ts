import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareCheckoutDraft } from "./checkout-draft";
import { saveCheckoutDraft } from "./save-checkout-draft";

const input = {
  draftId: "30000000-0000-4000-8000-000000000001", fullName: " Test Guest ",
  email: "TEST@example.com", phone: "98765 43210", roomType: "double-room" as const,
  checkIn: "2026-10-10", checkOut: "2026-10-12", guests: 2,
};
const now = new Date("2026-10-01T00:00:00Z");
afterEach(() => { vi.unstubAllGlobals(); });

describe("checkout draft input", () => {
  it("normalises contact details and derives the room-only starting quote", () => {
    expect(prepareCheckoutDraft(input, now)).toMatchObject({ fullName: "Test Guest", email: "test@example.com", phone: "+919876543210", rooms: 1, startingTotalPaise: 500_000 });
  });
  it("does not accept client-supplied booking, payment or pricing fields", () => {
    for (const field of ["status", "paid", "categoryId", "startingTotalPaise", "email_verified"]) expect(() => prepareCheckoutDraft({ ...input, [field]: "confirmed" }, now)).toThrow();
  });
  it("keeps new layouts unpriced and rejects unknown layouts", () => {
    expect(prepareCheckoutDraft({ ...input, roomType: "family-room-sofa", guests: 6 }, now)).toMatchObject({ rooms: 1, startingTotalPaise: null });
    expect(() => prepareCheckoutDraft({ ...input, roomType: "unknown" }, now)).toThrow();
  });
  it("rejects past, reversed and excessive stay dates", () => {
    for (const stay of [{ checkIn: "2026-09-01" }, { checkOut: "2026-10-09" }, { checkOut: "2028-10-12" }]) expect(() => prepareCheckoutDraft({ ...input, ...stay }, now)).toThrow();
  });
});

describe("save before showing checkout", () => {
  it("establishes browser ownership before POST and accepts only a matching receipt", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{"ready":true}')).mockResolvedValueOnce(Response.json({ saved: true, draftId: input.draftId, status: "draft", savedAt: "2026-10-01T12:00:00Z" }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await saveCheckoutDraft(input)).toMatchObject({ saved: true, status: "draft", draftId: input.draftId });
    expect(fetchMock.mock.calls[0][1].credentials).toBe("same-origin");
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).draftId).toBe(input.draftId);
  });
  it("does not POST or pretend to save when initialization is unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ error: "unavailable" }, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(saveCheckoutDraft(input)).rejects.toThrow("couldn't be saved");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("says plainly that checkout is closed when server storage is not configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ error: "checkout_unavailable" }, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(saveCheckoutDraft(input)).rejects.toThrow("Online checkout isn't open yet");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects a failed write and never trusts a raw database error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ ready: true })).mockResolvedValueOnce(Response.json({ error: "secret backend error" }, { status: 503 })));
    await expect(saveCheckoutDraft(input)).rejects.toThrow("retry before continuing");
  });
  it("rejects malformed or mismatched saved receipts", async () => {
    for (const receipt of [{ saved: false }, { saved: true, draftId: "30000000-0000-4000-8000-000000000002", status: "draft", savedAt: "2026-10-01T12:00:00Z" }]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ ready: true })).mockResolvedValueOnce(Response.json(receipt)));
      await expect(saveCheckoutDraft(input)).rejects.toThrow("couldn't be verified");
    }
  });
  it("asks to restart an expired browser-owned draft, retaining contact values", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ ready: true })).mockResolvedValueOnce(Response.json({ error: "checkout_expired" }, { status: 409 })));
    await expect(saveCheckoutDraft(input)).rejects.toMatchObject({ restartDraft: true });
    expect(input.fullName).toBe(" Test Guest ");
  });
});
