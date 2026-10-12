import "server-only";
import { NextRequest } from "next/server";
import { bookingOrigin, bookingResponse } from "./booking-http";
import { bookingGateway } from "./booking-gateway";
import { readStaffRole } from "./staff-access";
import type { StaffRole } from "@/lib/staff-types";

export async function staffApiAccess(request: NextRequest, roles: readonly StaffRole[], write = true) {
  if (write && !bookingOrigin(request)) return bookingResponse({ error: "Request not allowed." }, 403);
  const access = await readStaffRole();
  if (access.error || !access.role) return bookingResponse({ error: access.error }, access.status);
  if (!roles.includes(access.role)) return bookingResponse({ error: "This staff role cannot perform this action." }, 403);
  return null;
}

export async function staffGatewayResponse(action: string, input: Record<string, unknown>) {
  const result = await bookingGateway(action, input);
  const code = result.error?.code;
  const status = code && /^PT(400|401|403|404|409|429|503)$/.test(code) ? Number(code.slice(2)) : 503;
  return result.error ? bookingResponse({ error: result.error.message }, status) : bookingResponse({ saved: true, data: result.data });
}
