import { NextResponse } from "next/server";
import { createSessionSupabaseClient } from "@/lib/server/supabase-session";
import { safeAuthDestination } from "@/lib/auth-redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const destination = new URL(safeAuthDestination(url.searchParams.get("next"), url.origin), url.origin);
  const failure = () => {
    destination.searchParams.set("auth", "failed");
    const response = NextResponse.redirect(destination);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  if (url.searchParams.has("error")) return failure();
  const supabase = await createSessionSupabaseClient();

  if (!code || !supabase) return failure();
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure();
  } catch {
    return failure();
  }
  destination.searchParams.delete("auth");
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
