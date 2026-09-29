import { NextResponse } from "next/server";
import { createSessionSupabaseClient } from "@/lib/server/supabase-session";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const supabase = await createSessionSupabaseClient();

  if (!supabase || !code) {
    return NextResponse.redirect(new URL("/staff/login?error=signin", requestUrl.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(error ? "/staff/login?error=signin" : "/staff", requestUrl.origin));
}
