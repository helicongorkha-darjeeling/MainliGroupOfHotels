"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { formatHoldCountdown, remainingHoldSeconds } from "@/lib/booking-presentation";
import { formatInr } from "@/lib/rates";
import type { Reservation } from "@/lib/reservations";

type PaymentResult={razorpay_payment_id:string;razorpay_order_id:string;razorpay_signature:string};
type CheckoutConstructor=new(options:Record<string,unknown>)=>{open:()=>void;on:(event:string,callback:()=>void)=>void};
export function ReservationPayment({reservationId,holdUntil,amountPaise,autoStart=false,onResult}:{reservationId:string;holdUntil?:string|null;amountPaise?:number;autoStart?:boolean;onResult?:(reservation:Reservation)=>void}) {
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const [seconds,setSeconds]=useState<number|null>(null);
  const pending=useRef(false),autoOpened=useRef(false);
  const expired=!!holdUntil&&(!Number.isFinite(Date.parse(holdUntil))||seconds===0);
  useEffect(()=>{
    if(!holdUntil)return;
    const update=()=>setSeconds(remainingHoldSeconds(holdUntil,Date.now()));
    const timer=window.setInterval(update,1000);
    document.addEventListener("visibilitychange",update);window.addEventListener("pageshow",update);
    return ()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",update);window.removeEventListener("pageshow",update);};
  },[holdUntil]);
  function finish(message:string){pending.current=false;setBusy(false);setMessage(message);}
  async function pay() {
    const checkout=(window as Window&{Razorpay?:CheckoutConstructor}).Razorpay;
    if(!checkout||pending.current)return;
    if(holdUntil&&remainingHoldSeconds(holdUntil,Date.now())===0){finish("Your payment hold has ended. Choose rooms again to check current availability.");return;}
    pending.current=true;setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/payments/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reservationId}),signal:AbortSignal.timeout(30000)});
      const body=await response.json();if(!response.ok)throw new Error(body.error??"Payment is unavailable.");
      const order=body.data;
      const widget=new checkout({key:order.keyId,order_id:order.orderId,amount:order.amount,currency:order.currency,name:"Mainali Hospitality",description:`${order.reference}${order.mode==="test"?" · Test payment":""}`,prefill:order.prefill,
        config:{display:{
          blocks:{upi:{name:"Pay with UPI",instruments:[{method:"upi"}]}},
          sequence:["block.upi"],
          preferences:{show_default_blocks:true},
          hide:[{method:"upi",flows:["collect"]}],
        }},
        modal:{ondismiss:()=>finish("Checkout closed. You can retry before the original payment deadline.")},
        handler:async(result:PaymentResult)=>{
          try {
            const verify=await fetch("/api/payments/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reservationId,paymentId:result.razorpay_payment_id,signature:result.razorpay_signature}),signal:AbortSignal.timeout(30000)});
            const verified=await verify.json();if(!verify.ok)throw new Error(verified.error??"Payment is awaiting verification. Check My bookings shortly.");
            finish(["confirmed","checked_in","checked_out"].includes(verified.data.status)?"Payment verified. Your stay is confirmed.":"Payment received after the hold ended. The hotel must resolve or refund it; your booking is not confirmed.");
            onResult?.(verified.data);
          }catch(error){finish(error instanceof Error?error.message:"Payment verification is pending. Check My bookings before paying again.");}
        },
      });
      widget.on("payment.failed",()=>finish("Payment did not complete. You can retry while the hold remains valid."));widget.open();
    }catch(error){finish(error instanceof Error?error.message:"Unable to open secure checkout.");}
  }
  return <div className="reservation-payment">
    {holdUntil&&<div className={`payment-hold${expired?" payment-hold-ended":""}`}>
      {expired?<p role="status">Your hold has expired. Check availability again before paying.</p>:<><p>Complete payment to keep your rooms <strong role="timer" aria-live="off" aria-label="Payment time remaining">{seconds===null?"Checking deadline…":formatHoldCountdown(seconds)}</strong></p>
      <small>Held until {new Intl.DateTimeFormat("en-IN",{hour:"numeric",minute:"2-digit",timeZone:"Asia/Kolkata"}).format(new Date(holdUntil))} IST. The hold releases if payment is not confirmed in time.</small></>}
    </div>}
    <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={()=>{setReady(true);if(autoStart&&!autoOpened.current){autoOpened.current=true;void pay();}}} onError={()=>setMessage("Secure checkout could not load. Retry shortly.")} />
    <button type="button" className="button button-primary" disabled={!ready||busy||expired} onClick={pay}>{busy?"Checking payment…":`Pay now${amountPaise===undefined?"":` · ${formatInr(amountPaise)}`}`}</button>
    <p role="status" aria-live="polite">{message}</p></div>;
}
