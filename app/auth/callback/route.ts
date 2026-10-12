import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionSupabaseClient } from "@/lib/server/supabase-session";
import { authReturnCookieName, authReturnDestination, safeAuthDestination } from "@/lib/auth-redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const cookieStore = await cookies();
  // Keep legacy links working while new sign-ins use the fixed, exact callback URL.
  const next = url.searchParams.has("next") ? safeAuthDestination(url.searchParams.get("next"), url.origin) : authReturnDestination(cookieStore.get(authReturnCookieName)?.value, url.origin);
  const destination = new URL(next, url.origin);
  const redirect = () => {
    const response = NextResponse.redirect(destination);
    response.cookies.set(authReturnCookieName, "", { path: "/auth/callback", maxAge: 0, sameSite: "lax", secure: url.protocol === "https:" });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  const failure = () => {
    destination.searchParams.set("auth", "failed");
    return redirect();
  };
  if (url.searchParams.has("error")) return failure();
  if (!code) return failure();
  try {
    const supabase = await createSessionSupabaseClient();
    if (!supabase) return failure();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure();
  } catch {
    return failure();
  }
  destination.searchParams.delete("auth");
  return redirect();
}
