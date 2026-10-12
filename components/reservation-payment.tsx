"use client";
import Script from "next/script";
import { useState } from "react";
import type { Reservation } from "@/lib/reservations";

type PaymentResult={razorpay_payment_id:string;razorpay_order_id:string;razorpay_signature:string};
type CheckoutConstructor=new(options:Record<string,unknown>)=>{open:()=>void;on:(event:string,callback:()=>void)=>void};
export function ReservationPayment({reservationId,onResult}:{reservationId:string;onResult?:(reservation:Reservation)=>void}) {
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function pay() {
    const checkout=(window as Window&{Razorpay?:CheckoutConstructor}).Razorpay;
    if(!checkout||busy)return;
    setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/payments/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reservationId})});
      const body=await response.json();if(!response.ok)throw new Error(body.error??"Payment is unavailable.");
      const order=body.data;
      const widget=new checkout({key:order.keyId,order_id:order.orderId,amount:order.amount,currency:order.currency,name:"Mainali Hospitality",description:`${order.reference}${order.mode==="test"?" · Test payment":""}`,
        modal:{ondismiss:()=>{setBusy(false);setMessage("Checkout closed. Your hold expires at its original deadline.");}},
        handler:async(result:PaymentResult)=>{
          try {
            const verify=await fetch("/api/payments/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reservationId,paymentId:result.razorpay_payment_id,signature:result.razorpay_signature})});
            const verified=await verify.json();if(!verify.ok)throw new Error(verified.error??"Payment is awaiting verification. Check My bookings shortly.");
            setMessage(["confirmed","checked_in","checked_out"].includes(verified.data.status)?"Payment verified. Your confirmed stay has been updated.":"Payment received after the hold ended. The hotel must resolve or refund it; your booking is not confirmed.");
            onResult?.(verified.data);
          }catch(error){setMessage(error instanceof Error?error.message:"Payment verification is pending.");}finally{setBusy(false);}
        },
      });
      widget.on("payment.failed",()=>{setBusy(false);setMessage("Payment did not complete. You can retry while the hold remains valid.");});widget.open();
    }catch(error){setBusy(false);setMessage(error instanceof Error?error.message:"Unable to open secure checkout.");}
  }
  return <div className="reservation-payment"><Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={()=>setReady(true)} onError={()=>setMessage("Secure checkout could not load. Retry shortly.")} />
    <button type="button" className="button button-primary" disabled={!ready||busy} onClick={pay}>{busy?"Checking payment…":"Pay to confirm"}</button>
    <p role="status" aria-live="polite">{message}</p></div>;
}
