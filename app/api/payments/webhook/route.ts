import { readPublicSupabaseEnvironment } from "@/lib/server/env";
export const runtime="nodejs";
export async function POST(request:Request) {
  const env=readPublicSupabaseEnvironment();if(!env.success)return new Response("Unavailable",{status:503});
  const reader=request.body?.getReader();if(!reader)return new Response("Invalid body",{status:400});
  const chunks:Uint8Array[]=[];let length=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>16384){await reader.cancel();return new Response("Too large",{status:413});}chunks.push(value);}}
  finally {reader.releaseLock();}
  try {
    const result=await fetch(`${env.data.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/hotel-booking?action=webhook`,{method:"POST",headers:{apikey:env.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json","x-razorpay-signature":request.headers.get("x-razorpay-signature")??""},body:Buffer.concat(chunks),signal:AbortSignal.timeout(25000)});
    return new Response(await result.text(),{status:result.status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
  }catch{return new Response("Webhook reconciliation unavailable",{status:503});}
}
