import { NextResponse } from "next/server";
import { missingEnvironmentKeys, readServerEnvironment } from "@/lib/server/env";
import { createAdminSupabaseClient } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const environment = readServerEnvironment();
  if (!environment.success) {
    return NextResponse.json(
      {
        ready: false,
        reason: "configuration",
        missing: missingEnvironmentKeys(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("properties").select("id", { head: true, count: "exact" }).limit(1);

  if (error) {
    return NextResponse.json(
      { ready: false, reason: "database" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ready: true,
      bookingMode: environment.data.BOOKING_MODE,
      release: environment.data.APP_RELEASE ?? "unlabelled",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
