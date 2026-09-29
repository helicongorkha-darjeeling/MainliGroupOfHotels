import { NextResponse } from "next/server";
import { z } from "zod";
import { readServerEnvironment } from "@/lib/server/env";
import { createPublicSupabaseClient } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const availabilityQuery = z
  .object({
    property: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).default("hotel-teesta"),
    checkIn: z.string().date(),
    checkOut: z.string().date(),
    guests: z.coerce.number().int().min(1).max(20),
  })
  .refine((value) => value.checkOut > value.checkIn, {
    path: ["checkOut"],
    message: "Checkout must be after check-in.",
  });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = availabilityQuery.safeParse({
    property: url.searchParams.get("property") ?? undefined,
    checkIn: url.searchParams.get("checkIn"),
    checkOut: url.searchParams.get("checkOut"),
    guests: url.searchParams.get("guests"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_STAY_SEARCH", fields: parsed.error.flatten().fieldErrors },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const environment = readServerEnvironment();
  if (!environment.success || environment.data.BOOKING_MODE !== "live") {
    return NextResponse.json(
      { error: "BOOKING_NOT_LIVE", rooms: [] },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "3600" } },
    );
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("search_public_availability", {
    property_slug: parsed.data.property,
    requested_check_in: parsed.data.checkIn,
    requested_check_out: parsed.data.checkOut,
    requested_guests: parsed.data.guests,
  });

  if (error) {
    return NextResponse.json(
      { error: "AVAILABILITY_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } },
    );
  }

  return NextResponse.json(
    { rooms: data ?? [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
