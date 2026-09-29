import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { readPublicSupabaseEnvironment } from "@/lib/server/env";

export async function updateSupabaseSession(request: NextRequest) {
  const environment = readPublicSupabaseEnvironment();
  let response = NextResponse.next({ request });
  if (!environment.success) return response;

  const supabase = createServerClient(
    environment.data.NEXT_PUBLIC_SUPABASE_URL,
    environment.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  await supabase.auth.getClaims();
  return response;
}
