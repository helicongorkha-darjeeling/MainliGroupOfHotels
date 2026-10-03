import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/server/supabase-proxy";

export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/staff/:path*", "/book/:path*", "/my-bookings/:path*", "/members/:path*", "/auth/:path*"],
};
