import { NextResponse } from "next/server";
import { createSessionSupabaseClient } from "@/lib/server/supabase-session";

function safeDestination(requestUrl: URL) {
  const requested = requestUrl.searchParams.get("next") ?? "/my-bookings";
  if (!requested.startsWith("/") || requested.startsWith("//")) return "/my-bookings";
  const pathname = new URL(requested, requestUrl.origin).pathname;
  return pathname === "/book" || pathname === "/my-bookings" ? requested : "/my-bookings";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const destination = safeDestination(url);
  const supabase = await createSessionSupabaseClient();

  if (!code || !supabase) return NextResponse.redirect(new URL(`${destination}${destination.includes("?") ? "&" : "?"}auth=setup`, url.origin));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`${destination}${destination.includes("?") ? "&" : "?"}auth=failed`, url.origin));

  return NextResponse.redirect(new URL(destination, url.origin));
}
