import { NextRequest } from "next/server";
import { bookingResponse, smallJson } from "@/lib/server/booking-http";
import { readStaffAccess } from "@/lib/server/staff-access";
import { staffApiAccess, staffGatewayResponse } from "@/lib/server/staff-http";
import { staffChangeSchema } from "@/lib/staff-schemas";
export const runtime = "nodejs";
export async function GET() {
  const access = await readStaffAccess();
  if (!access.user) return bookingResponse({ error: "Sign in to continue." }, 401);
  if (!access.data) return bookingResponse({ error: access.error }, 403);
  return bookingResponse({ data: access.data });
}
export async function POST(request: NextRequest) {
  const denied = await staffApiAccess(request, ["manager", "reception"]); if (denied) return denied;
  let change; try { change = staffChangeSchema.parse(await smallJson(request)); }
  catch { return bookingResponse({ error: "Check the details and try again." }, 400); }
  if (["discount", "season", "settings", "checkin_correction"].includes(change.action) || (change.action === "check_out" && change.allowBalanceDue)) {
    const managerDenied = await staffApiAccess(request, ["manager"]); if (managerDenied) return managerDenied;
  }
  return staffGatewayResponse("staff-change", { change });
}
