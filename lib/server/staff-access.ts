import "server-only";
import { signedInGuest } from "./booking-http";
import { bookingGateway } from "./booking-gateway";
import type { HotelOperationsData } from "@/components/hotel-operations";

export const adminLoginEmail = "helicongorkha@gmail.com";

export async function readStaffAccess() {
  const user = await signedInGuest();
  if (!user) return { user: null, data: null, error: null };
  const result = await bookingGateway("staff");
  if (result.error) return { user, data: null, error: result.error.message };
  if (!result.data || !["manager", "reception"].includes(result.data.role)) {
    return { user, data: null, error: "Hotel staff access required." };
  }
  return { user, data: result.data as HotelOperationsData, error: null };
}
