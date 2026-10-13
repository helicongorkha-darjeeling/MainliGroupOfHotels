import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Older staff OAuth bookmarks no longer exchange codes into a staff session.
  return NextResponse.redirect(new URL("/staff/login", request.url));
}
