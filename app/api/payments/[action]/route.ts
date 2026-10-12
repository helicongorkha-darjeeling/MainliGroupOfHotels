import { NextRequest } from "next/server";
import { z } from "zod";
import { bookingGateway } from "@/lib/server/booking-gateway";
import { bookingOrigin,bookingResponse,smallJson,signedInGuest } from "@/lib/server/booking-http";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{action:string}>}) {
  if(!bookingOrigin(request))return bookingResponse({error:"Request not allowed."},403);
  if(!await signedInGuest())return bookingResponse({error:"Sign in to continue."},401);
  const {action}=await params;if(action!=="order"&&action!=="verify")return bookingResponse({error:"Not found."},404);
  const schema=action==="order"?z.object({reservationId:z.string().uuid()}).strict():z.object({reservationId:z.string().uuid(),paymentId:z.string().regex(/^pay_[A-Za-z0-9]+$/),signature:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
  let input;try{input=schema.parse(await smallJson(request));}catch{return bookingResponse({error:"Invalid payment request."},400);}
  const result=await bookingGateway(action,input);
  return bookingResponse(result.error?{error:result.error.message}:{data:result.data},result.error?503:200);
}
