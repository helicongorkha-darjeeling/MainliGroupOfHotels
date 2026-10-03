import { createHash, createHmac, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkoutDraftReceiptSchema, prepareCheckoutDraft } from "@/lib/checkout-draft";
import { readCheckoutEnvironment } from "@/lib/server/env";
import { createCheckoutSupabaseClient } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookieName = "teesta_checkout_session";
const tokenPattern = /^[a-f0-9]{64}$/;
const responseHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie" };

function result(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: responseHeaders });
}

function sameOrigin(request: NextRequest, requireOrigin = false) {
  const origin = request.headers.get("origin");
  // Next's internal URL can use localhost even when the browser requested 127.0.0.1.
  // Match the browser-facing Host, not a proxy host supplied by the caller.
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const expectedOrigin = `${request.nextUrl.protocol}//${host}`;
  return request.headers.get("x-checkout-request") === "1"
    && request.headers.get("sec-fetch-site") !== "cross-site"
    && (!requireOrigin || !!origin)
    && (!origin || origin === expectedOrigin);
}

export async function GET(request: NextRequest) {
  // This endpoint only establishes a browser-owned session; it never returns guest records.
  if (!sameOrigin(request)) return result({ error: "request_not_allowed" }, 403);
  if (!readCheckoutEnvironment().success) return result({ error: "checkout_unavailable" }, 503);
  const existing = request.cookies.get(cookieName)?.value;
  const response = result({ ready: true });
  if (!existing || !tokenPattern.test(existing)) {
    response.cookies.set(cookieName, randomBytes(32).toString("hex"), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/api/booking-drafts", maxAge: 7 * 24 * 60 * 60,
    });
  }
  return response;
}

async function readSmallJson(request: NextRequest) {
  if (!request.body) throw new Error("invalid_body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new Error("body_too_large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request, true)) return result({ error: "request_not_allowed" }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return result({ error: "json_required" }, 415);
  const token = request.cookies.get(cookieName)?.value;
  if (!token || !tokenPattern.test(token)) return result({ error: "checkout_session_required" }, 409);
  let draft: ReturnType<typeof prepareCheckoutDraft>;
  try { draft = prepareCheckoutDraft(await readSmallJson(request)); }
  catch (error) { return result({ error: "invalid_checkout_details" }, error instanceof Error && error.message === "body_too_large" ? 413 : 400); }
  const environment = readCheckoutEnvironment();
  if (!environment.success) return result({ error: "checkout_unavailable" }, 503);
  // Only trust the platform's client-IP header on Vercel. Raw IPs are never stored.
  const clientIp = process.env.VERCEL === "1" ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown" : "local";
  const rateKey = createHmac("sha256", environment.data.SUPABASE_SECRET_KEY).update(`checkout:${clientIp}`).digest("hex");
  const sessionHash = createHash("sha256").update(token).digest("hex");
  try {
    const { data, error } = await createCheckoutSupabaseClient().rpc("save_checkout_draft", {
      requested_draft_id: draft.draftId, browser_session_hash: sessionHash, request_rate_key: rateKey,
      guest_full_name: draft.fullName, guest_email: draft.email, guest_phone: draft.phone,
      selected_room_type: draft.roomType, stay_check_in: draft.checkIn, stay_check_out: draft.checkOut,
      party_guests: draft.guests,
    });
    if (error) {
      if (error.code === "PT429") return result({ error: "too_many_attempts" }, 429);
      if (error.code === "PT409") return result({ error: "checkout_expired" }, 409);
      return result({ error: "checkout_save_failed" }, 503);
    }
    const row = Array.isArray(data) ? data[0] : data;
    const receipt = checkoutDraftReceiptSchema.safeParse({ saved: true, draftId: row?.draft_id, status: "draft", savedAt: row?.saved_at });
    if (!receipt.success || receipt.data.draftId !== draft.draftId) return result({ error: "checkout_save_failed" }, 503);
    return result(receipt.data);
  } catch { return result({ error: "checkout_save_failed" }, 503); }
}
