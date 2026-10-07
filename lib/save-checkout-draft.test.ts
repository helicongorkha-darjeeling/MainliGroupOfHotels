import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckoutSaveError, saveCheckoutDraft } from "./save-checkout-draft";

const input = {
  draftId: "8f0f8e3a-4f61-4f52-9a0b-2f1b8f3c9d10", fullName: "Guest", email: "guest@example.com",
  phone: "+919876543210", checkIn: "2026-10-20", checkOut: "2026-10-21", guests: 2, roomType: "double-room",
} as Parameters<typeof saveCheckoutDraft>[0];

afterEach(() => vi.unstubAllGlobals());

describe("saveCheckoutDraft", () => {
  it("flags a closed checkout so the booking flow can continue without saving", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "checkout_unavailable" }), { status: 503 })));
    const error = await saveCheckoutDraft(input).catch((caught) => caught);
    expect(error).toBeInstanceOf(CheckoutSaveError);
    expect(error.checkoutClosed).toBe(true);
  });

  it("treats other failures as retryable, not closed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    const error = await saveCheckoutDraft(input).catch((caught) => caught);
    expect(error.checkoutClosed).toBe(false);
  });
});
