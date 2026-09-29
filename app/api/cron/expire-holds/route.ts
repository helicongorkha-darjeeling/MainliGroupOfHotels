import { NextResponse } from "next/server";
import { readServerEnvironment } from "@/lib/server/env";
import { createAdminSupabaseClient } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const environment = readServerEnvironment();
  if (!environment.success) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${environment.data.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("expire_inventory_holds");
  if (error) {
    return NextResponse.json({ error: "EXPIRY_JOB_FAILED" }, { status: 503 });
  }

  return NextResponse.json({ expiredBookings: data ?? 0 });
}
