import { NextResponse } from "next/server";
import { staySearchSchema,hotelToday } from "@/lib/stay";
import { searchInventory } from "@/lib/server/reservations";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
  const parsed=staySearchSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success||parsed.data.checkIn<hotelToday())return NextResponse.json({error:"Choose a valid future stay of up to 30 nights."},{status:400});
  const data=await searchInventory(parsed.data.checkIn,parsed.data.checkOut,parsed.data.guests);
  return NextResponse.json(data??{error:"Availability is temporarily unavailable."},{status:data?200:503,headers:{"Cache-Control":"no-store"}});
}
