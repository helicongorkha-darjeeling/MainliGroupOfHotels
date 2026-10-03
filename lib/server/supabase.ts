import "server-only";

import { createClient } from "@supabase/supabase-js";
import { readCheckoutEnvironment, requireServerEnvironment } from "@/lib/server/env";

export function createCheckoutSupabaseClient() {
  const environment = readCheckoutEnvironment();
  if (!environment.success) throw new Error("Checkout storage is not configured.");
  return createClient(environment.data.NEXT_PUBLIC_SUPABASE_URL, environment.data.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) },
  });
}

export function createAdminSupabaseClient() {
  const environment = requireServerEnvironment();
  return createClient(environment.NEXT_PUBLIC_SUPABASE_URL, environment.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function createPublicSupabaseClient() {
  const environment = requireServerEnvironment();
  return createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
