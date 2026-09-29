import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readPublicSupabaseEnvironment } from "@/lib/server/env";

export async function createSessionSupabaseClient() {
  const environment = readPublicSupabaseEnvironment();
  if (!environment.success) return null;

  const cookieStore = await cookies();
  return createServerClient(
    environment.data.NEXT_PUBLIC_SUPABASE_URL,
    environment.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // A Server Component cannot write cookies. The Next.js proxy refreshes them.
          }
        },
      },
    },
  );
}
