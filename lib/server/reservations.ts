import "server-only";
import { bookingGateway } from "./booking-gateway";
import { createSessionSupabaseClient } from "./supabase-session";
import type { InventorySearch, Reservation } from "../reservations";

export async function searchInventory(checkIn:string,checkOut:string,guests:number):Promise<InventorySearch|null> {
  try {
    const {data,error}=await bookingGateway("search",{checkIn,checkOut,guests});
    return error?null:data as InventorySearch;
  } catch { return null; }
}
export async function guestReservations() {
  const evaluatedAt=Date.now();
  const supabase=await createSessionSupabaseClient();
  const user=supabase?(await supabase.auth.getUser()).data.user:null;
  if(!supabase||!user) return {user,bookings:[] as Reservation[],unavailable:false,evaluatedAt};
  const {data,error}=await supabase.from("hotel_reservations").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);
  return {user,bookings:(data??[]) as Reservation[],unavailable:!!error,evaluatedAt};
}
