import { NextRequest } from "next/server";
import { bookingResponse, smallJson } from "@/lib/server/booking-http";
import { staffApiAccess, staffGatewayResponse } from "@/lib/server/staff-http";
import { staffDocumentSchema } from "@/lib/staff-schemas";
export async function POST(request: NextRequest) {
  const denied = await staffApiAccess(request, ["manager", "reception"]); if (denied) return denied;
  let input; try { input = staffDocumentSchema.parse(await smallJson(request)); }
  catch { return bookingResponse({ error: "Photo uploads are no longer used. Enter the guest's ID type and number at check-in." }, 400); }
  const { action, ...details } = input;
  return staffGatewayResponse(`staff-id-${action}`, details);
}
