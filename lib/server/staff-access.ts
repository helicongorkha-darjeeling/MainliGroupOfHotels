import "server-only";
import { signedInGuest } from "./booking-http";
import { bookingGateway } from "./booking-gateway";
import { isStaffRole, type StaffAccessData, type StaffRole, type StaffHousekeepingData } from "@/lib/staff-types";

export const adminLoginEmail = "helicongorkha@gmail.com";

export async function readStaffAccess() {
  const user = await signedInGuest();
  if (!user) return { user: null, data: null, error: null, errorCode: null };
  const result = await bookingGateway("staff");
  if (result.error) return { user, data: null, error: result.error.message, errorCode: result.error.code };
  if (!result.data || !isStaffRole(result.data.role)) {
    return { user, data: null, error: "Hotel staff access required.", errorCode: "PT403" };
  }
  // Project the housekeeping response again: private fields never enter its RSC payload.
  const data: StaffAccessData = result.data.role === "housekeeping" ? {
    role: "housekeeping", staffCoreReady: result.data.staffCoreReady === true,
    rooms: (result.data.rooms ?? []).map((room: StaffHousekeepingData["rooms"][number]) => ({
      number: room.number, category: room.category, name: room.name, active: room.active,
      housekeeping: room.housekeeping, occupancy: room.occupancy,
    })),
  } : result.data as StaffAccessData;
  return { user, data, error: null, errorCode: null };
}

export async function readStaffRole() {
  const user = await signedInGuest();
  if (!user) return { user: null, role: null, error: "Sign in to continue.", status: 401 };
  const result = await bookingGateway("staff-role");
  if (result.error) return { user, role: null, error: result.error.message, status: result.error.code === "PT401" ? 401 : result.error.code === "PT503" ? 503 : 403 };
  if (!isStaffRole(result.data?.role)) return { user, role: null, error: "Hotel staff access required.", status: 403 };
  return { user, role: result.data.role as StaffRole, error: null, status: 200 };
}
