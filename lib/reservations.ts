import { z } from "zod";
import { guestDetailsSchema } from "./guest-details";
import { hotelToday, nightsBetween } from "./stay";

export const reservationInputSchema = guestDetailsSchema.extend({
  requestId: z.string().uuid(),
  category: z.enum(["double-room","triple-room","four-person-room","six-person-room"]),
  checkIn: z.string().date(), checkOut: z.string().date(), guests: z.number().int().min(1).max(12),
  kind: z.enum(["tentative","payment_pending"]),
}).strict().refine(v => v.checkIn >= hotelToday() && v.checkOut > v.checkIn && nightsBetween(v.checkIn,v.checkOut)<=30,
  {message:"Choose a stay of up to 30 nights, starting today or later.",path:["checkOut"]});

export type ReservationInput = z.infer<typeof reservationInputSchema>;
export type Reservation = {
  id:string; reference:string; user_id:string|null; category:string; check_in:string; check_out:string;
  guests:number; rooms:number; full_name:string; email:string; phone:string; status:string;
  hold_until:string|null; total_paise:number; subtotal_paise:number; tax_paise:number|null; paid_paise:number;
  order_id:string|null; payment_id:string|null; created_at:string;
  payment_review_reason?:string|null;
};
export type InventoryChoice = {code:string; name:string; capacity:number; rooms:number; availableRooms:number; bookable:boolean;
  quote:{subtotalPaise:number;standardSubtotalPaise?:number;taxPaise:number|null;totalPaise:number;taxConfirmed:boolean;nights:number;nightlyPrices:{date:string;amountPaise:number;rateName:string}[]}};
export type InventorySearch = {onlineEnabled:boolean;paymentsEnabled:boolean;choices:InventoryChoice[]};
export const categoryLabels: Record<string,string> = {"double-room":"Double Room","triple-room":"Triple Room","four-person-room":"Four-person Room","six-person-room":"Six-person Room"};

export function isAvailable(choice:InventoryChoice) { return choice.bookable && choice.availableRooms>=choice.rooms; }
