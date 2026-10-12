import "server-only";
import { createSessionSupabaseClient } from "./supabase-session";
import { readPublicSupabaseEnvironment } from "./env";

export async function bookingGateway(action:string,input:Record<string,unknown>={}) {
  const env=readPublicSupabaseEnvironment();
  if(!env.success)return {data:null,error:{message:"Booking connection is not configured.",code:"PT503"}};
  const session=["search","settings","readiness","staff-login","invoice-public"].includes(action)?null:await createSessionSupabaseClient();
  const token=session?(await session.auth.getSession()).data.session?.access_token:null;
  try {
    const response=await fetch(`${env.data.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/hotel-booking`,{
      method:"POST",headers:{"Content-Type":"application/json",apikey:env.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,...(token?{Authorization:`Bearer ${token}`}:{})},
      body:JSON.stringify({action,...input}),cache:"no-store",signal:AbortSignal.timeout(25000),
    });
    const body=await response.json();
    return response.ok?{data:body.data,error:null}:{data:null,error:{message:body.error??"Booking service unavailable.",code:body.code??`PT${response.status}`}};
  }catch{return {data:null,error:{message:"Booking service unavailable. Retry shortly.",code:"PT503"}};}
}
