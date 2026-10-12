import { NextRequest } from "next/server";
import { z } from "zod";
import { bookingGateway } from "@/lib/server/booking-gateway";
import { bookingOrigin,bookingResponse,smallJson,signedInGuest } from "@/lib/server/booking-http";
export const runtime="nodejs";
const changeSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("confirm"),reservationId:z.string().uuid()}).strict(),
  ...["cancel","check_in","check_out"].map(action=>z.object({action:z.literal(action),reservationId:z.string().uuid()}).strict()),
  z.object({action:z.literal("assign"),reservationId:z.string().uuid(),rooms:z.array(z.string().regex(/^[0-9]{3}$/)).min(1).max(12)}).strict(),
  z.object({action:z.literal("housekeeping"),roomNumber:z.string().regex(/^[0-9]{3}$/),status:z.enum(["unknown","clean","dirty","out_of_service"])}).strict(),
  z.object({action:z.literal("season"),name:z.string().trim().min(2).max(80),startsOn:z.string().date(),endsOn:z.string().date(),soloPaise:z.number().int().min(100).max(10000000),couplePaise:z.number().int().min(100).max(10000000),perGuestPaise:z.number().int().min(100).max(10000000)}).strict(),
  z.object({action:z.literal("settings"),taxRateBps:z.number().int().min(0).max(10000),checkInTime:z.string().regex(/^\d{2}:\d{2}$/),checkOutTime:z.string().regex(/^\d{2}:\d{2}$/),cancellationTerms:z.string().trim().min(20).max(5000),paymentsEnabled:z.boolean()}).strict(),
]);
export async function POST(request:NextRequest){
  if(!bookingOrigin(request))return bookingResponse({error:"Request not allowed."},403);
  if(!await signedInGuest())return bookingResponse({error:"Sign in to continue."},401);
  let change;try{change=changeSchema.parse(await smallJson(request));}catch{return bookingResponse({error:"Invalid hotel update."},400);}
  const result=await bookingGateway("staff-change",{change});
  return bookingResponse(result.error?{error:result.error.message}:{saved:true},result.error?409:200);
}
