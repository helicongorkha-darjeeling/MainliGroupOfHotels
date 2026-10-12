import { NextRequest } from "next/server";
import { bookingResponse, smallJson } from "@/lib/server/booking-http";
import { staffApiAccess, staffGatewayResponse } from "@/lib/server/staff-http";
import { staffPaymentSchema } from "@/lib/staff-schemas";
export async function POST(request: NextRequest) {
  const denied = await staffApiAccess(request, ["manager", "reception"]); if (denied) return denied;
  let input; try { input = staffPaymentSchema.parse(await smallJson(request)); }
  catch { return bookingResponse({ error: "Choose a stay and payment method." }, 400); }
  return staffGatewayResponse("staff-balance-payment", input);
}

