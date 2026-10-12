import { NextRequest } from "next/server";
import { guestDetailsSchema } from "@/lib/guest-details";
import { bookingOrigin, bookingResponse, smallJson } from "@/lib/server/booking-http";
import { createSessionSupabaseClient } from "@/lib/server/supabase-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!bookingOrigin(request)) return bookingResponse({ error: "Request not allowed." }, 403);
  const client = await createSessionSupabaseClient();
  if (!client) return bookingResponse({ error: "Guest accounts are temporarily unavailable." }, 503);
  try {
    const { data, error } = await client.auth.getUser();
    const user = data.user;
    if (error || !user?.email_confirmed_at || !user.email) return bookingResponse({ error: "Sign in with Google to continue." }, 401);
    let parsed: ReturnType<typeof guestDetailsSchema.safeParse>;
    try { parsed = guestDetailsSchema.strict().safeParse(await smallJson(request)); }
    catch { return bookingResponse({ error: "Invalid contact details." }, 400); }
    if (!parsed.success) return bookingResponse({ error: parsed.error.issues[0].message }, 400);
    if (parsed.data.email !== user.email.toLowerCase()) return bookingResponse({ error: "Use your signed-in email address." }, 403);
    // These are editable contact details, never authorization or proof of mobile ownership.
    const saved = await client.auth.updateUser({ data: { full_name: parsed.data.fullName, booking_contact_phone: parsed.data.phone } });
    if (saved.error || !saved.data.user) return bookingResponse({ error: "Your contact details could not be saved. Please retry." }, 503);
    return bookingResponse({ saved: true });
  } catch { return bookingResponse({ error: "Your contact details could not be saved. Please retry." }, 503); }
}
