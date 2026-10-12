import { NextRequest } from "next/server";
import { z } from "zod";
import { bookingGateway } from "@/lib/server/booking-gateway";
import { bookingOrigin,bookingResponse,smallJson,signedInGuest } from "@/lib/server/booking-http";
export async function POST(request:NextRequest){
  if(!bookingOrigin(request))return bookingResponse({error:"Request not allowed."},403);
  if(!await signedInGuest())return bookingResponse({error:"Sign in to continue."},401);
  let input;try{input=z.object({reservationId:z.string().uuid()}).strict().parse(await smallJson(request));}catch{return bookingResponse({error:"Invalid reservation."},400);}
  const result=await bookingGateway("cancel",input);return bookingResponse(result.error?{error:result.error.message}:{cancelled:true},result.error?409:200);
}
