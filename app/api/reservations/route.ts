import { NextRequest } from "next/server";
import { reservationInputSchema } from "@/lib/reservations";
import { matchesVerifiedMobile } from "@/lib/mobile-checkout";
import { bookingGateway } from "@/lib/server/booking-gateway";
import { bookingOrigin,bookingResponse,smallJson,signedInGuest } from "@/lib/server/booking-http";

export const runtime="nodejs";
export async function POST(request:NextRequest) {
  if(!bookingOrigin(request))return bookingResponse({error:"Request not allowed."},403);
  const user=await signedInGuest();
  if(!user)return bookingResponse({error:"Sign in to reserve your stay."},401);
  let parsed:ReturnType<typeof reservationInputSchema.safeParse>;
  try {parsed=reservationInputSchema.safeParse(await smallJson(request));}catch{return bookingResponse({error:"Invalid reservation details."},400);}
  if(!parsed.success)return bookingResponse({error:parsed.error.issues[0].message},400);
  const input=parsed.data;
  if(!(user.email_confirmed_at&&user.email?.toLowerCase()===input.email.toLowerCase())&&!matchesVerifiedMobile(user,input.phone))
    return bookingResponse({error:"Use your signed-in email or verify your contact mobile."},403);
  try {
    const {data,error}=await bookingGateway("reserve",{args:{
      request_key:input.requestId,guest_user:user.id,category_code:input.category,stay_in:input.checkIn,stay_out:input.checkOut,party_guests:input.guests,
      guest_name:input.fullName,guest_email:input.email,guest_phone:input.phone,reservation_kind:input.kind,
    }});
    if(error){const codes:Record<string,number>={PT400:400,PT401:401,PT403:403,PT409:409,PT429:429,PT503:503};const code=codes[error.code];return bookingResponse({error:code?error.message:"Reservations are temporarily unavailable."},code??503);}
    return bookingResponse({reservation:data});
  }catch{return bookingResponse({error:"Reservations are temporarily unavailable."},503);}
}
