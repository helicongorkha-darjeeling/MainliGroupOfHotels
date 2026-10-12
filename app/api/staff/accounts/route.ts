import { NextRequest } from "next/server";
import { bookingResponse, smallJson } from "@/lib/server/booking-http";
import { staffApiAccess, staffGatewayResponse } from "@/lib/server/staff-http";
import { staffAccountSchema } from "@/lib/staff-schemas";
export async function POST(request: NextRequest) {
  const denied = await staffApiAccess(request, ["manager"]); if (denied) return denied;
  let input; try { input = staffAccountSchema.parse(await smallJson(request)); }
  catch { return bookingResponse({ error: "Check the staff details and use a password of at least 12 characters." }, 400); }
  return staffGatewayResponse("staff-account", { change: input });
}

