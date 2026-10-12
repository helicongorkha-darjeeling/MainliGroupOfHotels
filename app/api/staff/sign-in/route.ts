import { NextRequest } from "next/server";
import { z } from "zod";
import { bookingOrigin, bookingResponse, smallJson } from "@/lib/server/booking-http";
import { bookingGateway } from "@/lib/server/booking-gateway";
import { createSessionSupabaseClient } from "@/lib/server/supabase-session";
import { isStaffRole, staffHome } from "@/lib/staff-types";
const credentials = z.object({ username: z.string().trim().min(3).max(254), password: z.string().min(1).max(128) }).strict();

export async function POST(request: NextRequest) {
  if (!bookingOrigin(request)) return bookingResponse({ error: "Request not allowed." }, 403);
  let input; try { input = credentials.parse(await smallJson(request)); }
  catch { return bookingResponse({ error: "Enter your username and password." }, 400); }
  const result = await bookingGateway("staff-login", input);
  if (result.error) return bookingResponse({ error: "Sign-in failed. Check your username and password, or ask your manager." }, result.error.code === "PT429" ? 429 : result.error.code === "PT503" ? 503 : 401);
  const session = result.data?.session;
  if (!session?.access_token || !session.refresh_token || !isStaffRole(result.data?.role)) return bookingResponse({ error: "Sign-in is unavailable. Ask your manager." }, 503);
  const client = await createSessionSupabaseClient();
  if (!client) return bookingResponse({ error: "Sign-in is not configured." }, 503);
  const { error } = await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
  if (error) return bookingResponse({ error: "Sign-in failed. Try again." }, 401);
  // The role comes from the gateway after Auth verification, never from this form.
  return bookingResponse({ destination: staffHome(result.data.role) });
}
