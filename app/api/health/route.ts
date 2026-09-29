import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    property: "hotel-teesta",
    bookingMode: process.env.BOOKING_MODE ?? "preview",
    release: process.env.APP_RELEASE ?? "local",
  });
}
