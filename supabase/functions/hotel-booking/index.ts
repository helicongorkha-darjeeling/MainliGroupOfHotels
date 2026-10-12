import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth:{persistSession:false,autoRefreshToken:false},
});
const allowedOrigins = new Set(["http://localhost:3000","http://127.0.0.1:3000","https://mainli-group-of-hotels.vercel.app"]);
const reply = (body:unknown,status=200,origin:string|null=null) => new Response(JSON.stringify(body),{
  status, headers:{"Content-Type":"application/json","Cache-Control":"no-store",
    ...(origin&&allowedOrigins.has(origin)?{"Access-Control-Allow-Origin":origin,"Vary":"Origin"}:{})},
});
async function readBody(req:Request) {
  if(!req.body)throw new Error("invalid_body");
  const reader=req.body.getReader();let size=0;const chunks:Uint8Array[]=[];
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();throw new Error("invalid_body");}chunks.push(value);}}finally{reader.releaseLock();}
  const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}
  return new TextDecoder().decode(all);
}
async function hmac(secret:string,message:string) {
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message)))].map(n=>n.toString(16).padStart(2,"0")).join("");
}
function signatureMatches(actual:string|null,expected:string) {
  if(!actual||!/^[a-f0-9]{64}$/.test(actual)||actual.length!==expected.length)return false;
  let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);return diff===0;
}
function paymentConfig() {
  const id=Deno.env.get("RAZORPAY_KEY_ID"),secret=Deno.env.get("RAZORPAY_KEY_SECRET");
  const mode=Deno.env.get("RAZORPAY_MODE")??"test";
  if(!id||!secret||!id.startsWith(mode==="live"?"rzp_live_":"rzp_test_"))throw new Error("payment_setup");
  return {id,secret,mode};
}
async function provider(path:string,options:RequestInit={}) {
  const {id,secret}=paymentConfig();
  const r=await fetch(`https://api.razorpay.com/v1/${path}`,{...options,headers:{Authorization:`Basic ${btoa(`${id}:${secret}`)}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error("payment_provider");return r.json();
}
async function verifiedPayment(orderId:string,paymentId:string) {
  if(!/^order_[A-Za-z0-9]+$/.test(orderId)||!/^pay_[A-Za-z0-9]+$/.test(paymentId))throw new Error("payment_mismatch");
  const payment=await provider(`payments/${paymentId}`);
  if(payment.order_id!==orderId||payment.currency!=="INR"||payment.status!=="captured")throw new Error("payment_pending");
  const {data,error}=await db.rpc("hotel_record_payment",{provider_order:orderId,provider_payment:paymentId,paid_amount:payment.amount});
  if(error)throw new Error("payment_mismatch");return data;
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");
  if(origin&&!allowedOrigins.has(origin))return reply({error:"Request not allowed."},403);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":origin??"https://mainli-group-of-hotels.vercel.app","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"}});
  if(req.method!=="POST")return reply({error:"Method not allowed."},405,origin);
  try {
    const raw=await readBody(req);
    const action=new URL(req.url).searchParams.get("action");
    if(action==="jobs") {
      const cronSecret=Deno.env.get("HOTEL_CRON_SECRET");
      if(!cronSecret||cronSecret.length<32||req.headers.get("authorization")!==`Bearer ${cronSecret}`)return reply({error:"Scheduler authentication required."},401);
      const apiKey=Deno.env.get("RESEND_API_KEY"),sender=Deno.env.get("RESEND_FROM_EMAIL");
      await db.rpc("hotel_expire_holds");
      if(!apiKey||!sender)return reply({error:"Email provider and verified sender are not configured."},503);
      const {data:jobs,error}=await db.rpc("hotel_claim_notifications");
      if(error)throw new Error("database");
      let accepted=0,failed=0;
      for(const job of jobs??[]) {
        const {data:booking}=await db.from("hotel_reservations").select("*").eq("id",job.reservation_id).single();
        if(!booking){failed++;continue;}
        const subjects:Record<string,string>={tentative_receipt:"Your tentative reservation",hold_reminder:"Your room hold expires soon",confirmation:"Your stay is confirmed",arrival_reminder:"Your upcoming Hotel Teesta stay",payment_review:"Payment received — hotel review required"};
        const deadline=booking.hold_until?new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(booking.hold_until)):null;
        const text=`Hello ${booking.full_name},\n\n${subjects[job.kind]}: ${booking.reference}.\nStay: ${booking.check_in} to ${booking.check_out}; ${booking.guests} guests; ${booking.rooms} rooms.\n${deadline?`Your tentative hold expires at ${deadline} IST. It releases unless confirmed.\n`:""}${job.kind==="payment_review"?"Your booking is not confirmed. The hotel must resolve or refund the captured payment. Do not pay again.\n":""}\nView your reservation: https://mainli-group-of-hotels.vercel.app/my-bookings\n\nMainali Hospitality · Hotel Teesta\nThis is a reservation update, not a marketing message.`;
        try {
          const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json","Idempotency-Key":`mainali-reservation/${job.id}`},body:JSON.stringify({from:sender,to:[booking.email],subject:`${subjects[job.kind]} · ${booking.reference}`,text}),signal:AbortSignal.timeout(10000)});
          if(!response.ok)throw new Error(`provider_http_${response.status}`);
          const {error:saveError}=await db.from("hotel_notification_jobs").update({sent_at:new Date().toISOString(),locked_until:null,last_error:null}).eq("id",job.id);
          if(saveError)throw new Error("receipt_save_failed");accepted++;
        }catch(error){failed++;await db.from("hotel_notification_jobs").update({locked_until:new Date(Date.now()+5*60*1000).toISOString(),last_error:error instanceof Error&&/^provider_http_\d+$/.test(error.message)?error.message:"delivery_retry_needed"}).eq("id",job.id);}
      }
      return reply({accepted,failed});
    }
    if(action==="webhook") {
      const secret=Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
      if(!secret)return reply({error:"Webhook not configured."},503);
      if(!signatureMatches(req.headers.get("x-razorpay-signature"),await hmac(secret,raw)))return reply({error:"Invalid signature."},401);
      const event=JSON.parse(raw);
      if(event.event!=="payment.captured"&&event.event!=="order.paid")return reply({received:true});
      const payment=event.payload?.payment?.entity;
      if(!payment?.id||!payment?.order_id)return reply({error:"Invalid payment event."},400);
      await verifiedPayment(payment.order_id,payment.id);return reply({received:true});
    }
    const input=JSON.parse(raw);
    if(input.action==="readiness"||input.action==="settings") {
      const {data:settings,error}=await db.from("hotel_booking_settings").select("online_enabled,payments_enabled,tax_rate_bps,cancellation_terms,check_in_time,check_out_time").eq("slug","hotel-teesta").single();
      if(error)throw new Error("database");
      return reply({data:{...settings,emailReady:!!Deno.env.get("RESEND_API_KEY")&&!!Deno.env.get("RESEND_FROM_EMAIL"),schedulerReady:!!Deno.env.get("HOTEL_CRON_SECRET"),paymentCredentialsReady:!!Deno.env.get("RAZORPAY_KEY_ID")&&!!Deno.env.get("RAZORPAY_KEY_SECRET")&&!!Deno.env.get("RAZORPAY_WEBHOOK_SECRET")}},200,origin);
    }
    if(input.action==="search") {
      const {data,error}=await db.rpc("hotel_search",{stay_in:input.checkIn,stay_out:input.checkOut,party_guests:input.guests});
      if(error)return reply({error:"Choose valid dates and guest count."},400,origin);
      return reply({data:{...data,paymentsEnabled:data.paymentsEnabled&&!!Deno.env.get("RAZORPAY_KEY_ID")&&!!Deno.env.get("RAZORPAY_KEY_SECRET")}},200,origin);
    }
    // Custom Auth validation is mandatory for every action with private data or capacity mutations.
    const token=req.headers.get("authorization")?.replace(/^Bearer /i,"");
    if(!token)return reply({error:"Sign in to continue."},401,origin);
    const {data:auth,error:authError}=await db.auth.getUser(token);
    const user=auth.user;
    if(authError||!user||(!user.email_confirmed_at&&!user.phone_confirmed_at))return reply({error:"Verified sign-in required."},401,origin);
    if(input.action==="reserve") {
      const a=input.args;
      const emailMatches=user.email_confirmed_at&&user.email?.toLowerCase()===a?.guest_email?.toLowerCase();
      const phoneMatches=user.phone_confirmed_at&&`+${user.phone?.replace(/^\+/,"")}`===a?.guest_phone;
      if(!emailMatches&&!phoneMatches)return reply({error:"Use your signed-in email or verified mobile."},403,origin);
      const {data,error}=await db.rpc("hotel_reserve",{request_key:a.request_key,guest_user:user.id,category_code:a.category_code,stay_in:a.stay_in,stay_out:a.stay_out,
        party_guests:a.party_guests,guest_name:a.guest_name,guest_email:a.guest_email,guest_phone:a.guest_phone,reservation_kind:a.reservation_kind});
      if(error){const status:Record<string,number>={PT400:400,PT401:401,PT409:409,PT429:429,PT503:503};return reply({error:status[error.code]?error.message:"Reservation unavailable.",code:error.code},status[error.code]??503,origin);}
      return reply({data},200,origin);
    }
    if(input.action==="cancel") {
      const {data,error}=await db.rpc("hotel_cancel_tentative",{guest_user:user.id,reservation_id:input.reservationId});
      if(error)return reply({error:["PT404","PT409"].includes(error.code)?error.message:"Cancellation unavailable."},409,origin);
      return reply({data},200,origin);
    }
    if(input.action==="order"||input.action==="verify") {
      const {data:booking,error}=await db.from("hotel_reservations").select("*").eq("id",input.reservationId).eq("user_id",user.id).maybeSingle();
      if(error||!booking)return reply({error:"Reservation not found."},404,origin);
      if(input.action==="verify") {
        const config=paymentConfig();
        if(!booking.order_id||!signatureMatches(input.signature,await hmac(config.secret,`${booking.order_id}|${input.paymentId}`)))return reply({error:"Payment verification failed."},400,origin);
        return reply({data:await verifiedPayment(booking.order_id,input.paymentId)},200,origin);
      }
      if(!["tentative","payment_pending"].includes(booking.status)||Date.parse(booking.hold_until)<=Date.now())return reply({error:"Your hold has ended. Choose rooms again."},409,origin);
      const {data:settings}=await db.from("hotel_booking_settings").select("payments_enabled").eq("slug","hotel-teesta").single();
      if(!settings?.payments_enabled||booking.tax_paise===null)return reply({error:"Final taxes and payment setup are awaiting hotel approval."},503,origin);
      const config=paymentConfig();
      let orderId=booking.order_id;
      if(!orderId) {
        const order=await provider("orders",{method:"POST",body:JSON.stringify({amount:booking.total_paise,currency:"INR",receipt:booking.reference,notes:{reservation_id:booking.id}})});
        const {data:saved,error:saveError}=await db.from("hotel_reservations").update({order_id:order.id}).eq("id",booking.id).is("order_id",null).in("status",["tentative","payment_pending"]).gt("hold_until",new Date().toISOString()).select("order_id").maybeSingle();
        if(saveError)throw new Error("payment_provider");
        if(!saved){const {data:existing}=await db.from("hotel_reservations").select("order_id").eq("id",booking.id).single();orderId=existing?.order_id;}else orderId=saved.order_id;
        if(!orderId)throw new Error("payment_pending");
      }
      return reply({data:{orderId,keyId:config.id,amount:booking.total_paise,currency:"INR",reference:booking.reference,mode:config.mode}},200,origin);
    }
    const {data:staff}=await db.from("hotel_staff").select("role").eq("user_id",user.id).eq("active",true).maybeSingle();
    if(!staff)return reply({error:"Hotel staff access required."},403,origin);
    if(input.action==="staff") {
      await db.rpc("hotel_expire_holds");
      const [rooms,reservations,categories,seasons,settings,assignments]=await Promise.all([
        db.from("hotel_inventory_rooms").select("*").order("number"),db.from("hotel_reservations").select("*").gte("check_out",new Date().toISOString().slice(0,10)).order("check_in").limit(500),
        db.from("hotel_inventory_categories").select("*"),db.from("hotel_seasonal_rates").select("*"),db.from("hotel_booking_settings").select("*").single(),db.from("hotel_room_assignments").select("reservation_id,room_number"),
      ]);
      if([rooms,reservations,categories,seasons,settings,assignments].some(r=>r.error))throw new Error("database");
      return reply({data:{rooms:rooms.data,reservations:reservations.data,categories:categories.data,seasons:seasons.data,settings:settings.data,assignments:assignments.data,role:staff.role,
        emailReady:!!Deno.env.get("RESEND_API_KEY")&&!!Deno.env.get("RESEND_FROM_EMAIL"),paymentReady:!!Deno.env.get("RAZORPAY_KEY_ID")&&!!Deno.env.get("RAZORPAY_KEY_SECRET"),schedulerReady:!!Deno.env.get("HOTEL_CRON_SECRET")}},200,origin);
    }
    if(input.action==="staff-change") {
      const {data,error}=await db.rpc("hotel_staff_change",{actor:user.id,change:input.change});
      if(error)return reply({error:["PT400","PT409","PT403"].includes(error.code)?error.message:"Change failed."},409,origin);
      return reply({data},200,origin);
    }
    return reply({error:"Unknown action."},400,origin);
  }catch(e){
    const message=e instanceof Error?e.message:"unknown";
    const messages:Record<string,string>={payment_setup:"Secure payment setup is incomplete.",payment_provider:"The payment provider is unavailable. Retry shortly.",payment_pending:"Payment capture is pending. Your booking is not yet confirmed.",payment_mismatch:"Payment could not be reconciled. Contact the hotel.",invalid_body:"Invalid request."};
    return reply({error:messages[message]??"Booking service temporarily unavailable."},message==="invalid_body"?400:503,origin);
  }
});
