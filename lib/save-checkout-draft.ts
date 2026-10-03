import { checkoutDraftReceiptSchema, type CheckoutDraftInput } from "./checkout-draft";

export class CheckoutSaveError extends Error {
  constructor(message: string, public readonly restartDraft = false) { super(message); }
}

export async function saveCheckoutDraft(input: CheckoutDraftInput) {
  // Establish ownership before writing, so a lost POST response can safely be retried.
  const session = await fetch("/api/booking-drafts", {
    credentials: "same-origin", cache: "no-store",
    headers: { "X-Checkout-Request": "1" }, signal: AbortSignal.timeout(12_000),
  });
  if (!session.ok) {
    // Missing server configuration won't fix itself on retry, so say so plainly.
    const unavailable = session.status === 503 && (await session.json().catch(() => null))?.error === "checkout_unavailable";
    throw new CheckoutSaveError(unavailable
      ? "Online checkout isn't open yet, so your details weren't saved. No room has been reserved; please contact the hotel to book."
      : "Your details couldn't be saved right now. Please try again. No room has been reserved.");
  }
  const response = await fetch("/api/booking-drafts", {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", "X-Checkout-Request": "1" },
    body: JSON.stringify(input), signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    if (response.status === 409) throw new CheckoutSaveError("This checkout has expired. Your details are still here; press continue again to start a new draft.", true);
    throw new CheckoutSaveError(response.status === 429
      ? "Too many checkout attempts. Please wait a few minutes and try again."
      : "Your details couldn't be saved. Please retry before continuing. No room has been reserved.");
  }
  const receipt = checkoutDraftReceiptSchema.safeParse(await response.json());
  if (!receipt.success || receipt.data.draftId !== input.draftId) throw new CheckoutSaveError("Your checkout couldn't be verified. Please try again.");
  return receipt.data;
}
