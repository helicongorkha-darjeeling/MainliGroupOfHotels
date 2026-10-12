import { NextRequest } from "next/server";
import { bookingResponse, smallJson } from "@/lib/server/booking-http";
import { staffApiAccess, staffGatewayResponse } from "@/lib/server/staff-http";
import { staffInvoiceSchema } from "@/lib/staff-schemas";
export async function POST(request: NextRequest) {
  const denied = await staffApiAccess(request, ["manager", "reception"]); if (denied) return denied;
  let input; try { input = staffInvoiceSchema.parse(await smallJson(request)); }
  catch { return bookingResponse({ error: "Choose a stay and invoice action." }, 400); }
  return staffGatewayResponse("staff-invoice", input);
}

