import { NextResponse } from "next/server";
import { bookingGateway } from "@/lib/server/booking-gateway";
export const dynamic="force-dynamic";
export async function GET() {
  const {data,error}=await bookingGateway("readiness");
  if(error)return NextResponse.json({ready:false,reason:"booking_service"},{status:503,headers:{"Cache-Control":"no-store"}});
  return NextResponse.json({ready:data.online_enabled,reservationsReady:data.online_enabled,paymentsReady:data.payments_enabled&&data.tax_rate_bps!==null&&data.paymentCredentialsReady,emailReady:data.emailReady,remindersReady:data.emailReady&&data.schedulerReady,taxesApproved:data.tax_rate_bps!==null,policiesApproved:!!data.cancellation_terms},{headers:{"Cache-Control":"no-store"}});
}