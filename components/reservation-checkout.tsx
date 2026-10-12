"use client";
import { useRef,useState,type FormEvent,type ReactNode } from "react";
import Link from "next/link";
import { GoogleAuth } from "./google-auth";
import { ReservationPayment } from "./reservation-payment";
import { BookingSteps } from "./booking-steps";
import { formatInr } from "@/lib/rates";
import { reservationInputSchema,type Reservation } from "@/lib/reservations";

export function ReservationCheckout({bookingPath,checkIn,checkOut,guests,category,signedIn,initialEmail,initialName,initialPhone,paymentsEnabled,reviewedTotalPaise,authError=false,children}:{
  bookingPath:string;checkIn:string;checkOut:string;guests:number;category:string;signedIn:boolean;initialEmail:string;initialName:string;initialPhone:string;paymentsEnabled:boolean;reviewedTotalPaise:number;authError?:boolean;children?:ReactNode;
}) {
  const [fullName,setName]=useState(initialName),[email,setEmail]=useState(initialEmail),[phone,setPhone]=useState(initialPhone);
  const [autoPay,setAutoPay]=useState(false);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[reservation,setReservation]=useState<Reservation|null>(null);
  const pending=useRef(false),requestId=useRef<string|null>(null);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(pending.current||!paymentsEnabled)return;
    const storageKey=`mainali-payment:${initialEmail}:${bookingPath}`;
    if(!requestId.current){try {requestId.current=sessionStorage.getItem(storageKey);}catch{/* In-memory retries still work. */}requestId.current??=crypto.randomUUID();try{sessionStorage.setItem(storageKey,requestId.current);}catch{/* Optional storage. */}}
    const parsed=reservationInputSchema.safeParse({requestId:requestId.current,fullName,email,phone,category,checkIn,checkOut,guests,kind:"payment_pending"});
    if(!parsed.success){setMessage(parsed.error.issues[0].message);return;}
    pending.current=true;setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/reservations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data),signal:AbortSignal.timeout(30000)});
      const body=await response.json();if(!response.ok)throw new Error(body.error??"The reservation could not be completed.");
      const saved=body.reservation as Reservation;
      const ended=["cancelled","expired"].includes(saved.status)||(["tentative","payment_pending"].includes(saved.status)&&!!saved.hold_until&&Date.parse(saved.hold_until)<=Date.now());
      if(ended){requestId.current=null;try{sessionStorage.removeItem(storageKey);}catch{/* Optional storage. */}setMessage("Your previous hold has ended. Submit again to request a new reservation at the current price and availability.");return;}
      setAutoPay(saved.status==="payment_pending"&&saved.total_paise===reviewedTotalPaise);
      setReservation(saved);
    }catch(error){setMessage(error instanceof Error?error.message:"Could not reach the hotel. Retry using the same details; repeated requests do not create duplicate holds.");}
    finally{pending.current=false;setBusy(false);}
  }
  if(reservation)return <section className="reservation-receipt"><BookingSteps step={3}/><p className="eyebrow">{reservation.status==="confirmed"?"Booking confirmed":"Complete your booking"}</p><h2>{reservation.reference}</h2>
    <p role="status">{reservation.status==="payment_pending"?"Your rooms are held for 15 minutes while you complete payment. Confirmation follows verified payment.":reservation.status==="confirmed"?"Your payment is verified and your stay is confirmed.":`Status: ${reservation.status.replaceAll("_"," ")}`}</p>
    {reservation.total_paise!==reviewedTotalPaise&&reservation.status==="payment_pending"&&<p className="preview-alert">The price changed since your review. Check the updated total before paying.</p>}
    <div className="booking-total"><span>{reservation.status==="confirmed"?"Booking total":"Payable total"}</span><strong>{formatInr(reservation.total_paise)}</strong></div>
    {paymentsEnabled&&reservation.status==="payment_pending"&&<ReservationPayment reservationId={reservation.id} holdUntil={reservation.hold_until} amountPaise={reservation.total_paise} autoStart={autoPay} onResult={setReservation} />}
    <Link className="button button-outline" href="/my-bookings">View My bookings</Link></section>;
  if(!signedIn)return <section className="checkout-sign-in"><BookingSteps step={1}/><h2>Continue with your Google account.</h2><p>Your dates and room choice return with you. Next, review your room and the full stay price before paying.</p><GoogleAuth destination={bookingPath} authError={authError}/></section>;
  return <form className="guest-signin-form reservation-form" onSubmit={submit}>
    <BookingSteps step={2}/>
    <div className="checkout-room-review">{children}</div>
    <h2>Guest details</h2>
    <label>Full name<input name="fullName" autoComplete="name" maxLength={120} required value={fullName} onChange={e=>setName(e.target.value)} disabled={busy}/></label>
    <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)} readOnly={!!initialEmail} disabled={busy}/></label>
    <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" maxLength={30} required value={phone} onChange={e=>setPhone(e.target.value)} disabled={busy}/></label>
    <p>Pay now checks availability again and starts a 15-minute payment hold. Your stay is confirmed after payment is verified. Read the <Link href="/policies/booking-terms">booking terms</Link> and <Link href="/policies/privacy">privacy notice</Link>.</p>
    {!paymentsEnabled&&<p className="checkout-payment-notice">Online payment is being prepared. You can review your stay, but no room will be held or charged until payment opens.</p>}
    <div className="checkout-pay-action"><button className="button button-primary" disabled={busy||!paymentsEnabled} type="submit">{busy?"Checking availability…":`Pay now · ${formatInr(reviewedTotalPaise)}`}</button><small>{paymentsEnabled?"Secure payment with Razorpay · confirmation after verified payment":"Payment opens after hotel tax and payment setup"}</small></div>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
