"use client";
import { useRef,useState,type FormEvent } from "react";
import Link from "next/link";
import { GoogleAuth } from "./google-auth";
import { ReservationPayment } from "./reservation-payment";
import { reservationInputSchema,type Reservation } from "@/lib/reservations";

export function ReservationCheckout({bookingPath,checkIn,checkOut,guests,category,signedIn,initialEmail,initialName,initialPhone,paymentsEnabled}:{
  bookingPath:string;checkIn:string;checkOut:string;guests:number;category:string;signedIn:boolean;initialEmail:string;initialName:string;initialPhone:string;paymentsEnabled:boolean;
}) {
  const [fullName,setName]=useState(initialName),[email,setEmail]=useState(initialEmail),[phone,setPhone]=useState(initialPhone);
  const [kind,setKind]=useState<"tentative"|"payment_pending">("tentative");
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[reservation,setReservation]=useState<Reservation|null>(null);
  const pending=useRef(false),requestId=useRef<string|null>(null);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(pending.current)return;
    const storageKey=`mainali-reservation:${initialEmail}:${bookingPath}`;
    if(!requestId.current){try {requestId.current=sessionStorage.getItem(storageKey);}catch{/* In-memory retries still work. */}requestId.current??=crypto.randomUUID();try{sessionStorage.setItem(storageKey,requestId.current);}catch{/* Optional storage. */}}
    const parsed=reservationInputSchema.safeParse({requestId:requestId.current,fullName,email,phone,category,checkIn,checkOut,guests,kind});
    if(!parsed.success){setMessage(parsed.error.issues[0].message);return;}
    pending.current=true;setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/reservations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data),signal:AbortSignal.timeout(30000)});
      const body=await response.json();if(!response.ok)throw new Error(body.error??"The reservation could not be completed.");
      const saved=body.reservation as Reservation;
      const ended=["cancelled","expired"].includes(saved.status)||(["tentative","payment_pending"].includes(saved.status)&&!!saved.hold_until&&Date.parse(saved.hold_until)<=Date.now());
      if(ended){requestId.current=null;try{sessionStorage.removeItem(storageKey);}catch{/* Optional storage. */}setMessage("Your previous hold has ended. Submit again to request a new reservation at the current price and availability.");return;}
      setReservation(body.reservation);
    }catch(error){setMessage(error instanceof Error?error.message:"Could not reach the hotel. Retry using the same details; repeated requests do not create duplicate holds.");}
    finally{pending.current=false;setBusy(false);}
  }
  if(reservation)return <section className="reservation-receipt" aria-live="polite"><p className="eyebrow">{reservation.status==="confirmed"?"Booking confirmed":"Reservation recorded"}</p><h2>{reservation.reference}</h2>
    <p>{reservation.status==="tentative"?"Your rooms are held for 24 hours. This is a tentative reservation, not a payment-confirmed booking.":reservation.status==="payment_pending"?"Your rooms are held while you complete payment.":`Status: ${reservation.status.replaceAll("_"," ")}`}</p>
    {reservation.hold_until&&<p>Hold expires: {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(reservation.hold_until))} IST.</p>}
    {paymentsEnabled&&["tentative","payment_pending"].includes(reservation.status)&&<ReservationPayment reservationId={reservation.id} onResult={setReservation} />}
    <p>The front desk can follow up and confirm your stay. Email updates will be sent when the hotel’s email service is configured.</p><Link className="button button-outline" href="/my-bookings">View My bookings</Link></section>;
  if(!signedIn)return <section className="checkout-sign-in"><h2>Sign in to reserve your stay.</h2><p>Your Google account securely links this reservation to My bookings. Your dates and room choice return with you after sign-in.</p><GoogleAuth destination={bookingPath} /></section>;
  return <form className="guest-signin-form reservation-form" onSubmit={submit}>
    <h2>Guest details</h2>
    <label>Full name<input name="fullName" autoComplete="name" maxLength={120} required value={fullName} onChange={e=>setName(e.target.value)} disabled={busy}/></label>
    <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>
    <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" maxLength={30} required value={phone} onChange={e=>setPhone(e.target.value)} disabled={busy}/></label>
    <fieldset className="reservation-options"><legend>How would you like to reserve?</legend><label><input type="radio" name="reservationKind" checked={kind==="tentative"} onChange={()=>setKind("tentative")} disabled={busy}/><span>Hold my rooms for 24 hours<small>No charge now. The hold releases unless confirmed.</small></span></label>
      <label><input type="radio" name="reservationKind" checked={kind==="payment_pending"} onChange={()=>setKind("payment_pending")} disabled={busy||!paymentsEnabled}/><span>Pay to confirm<small>{paymentsEnabled?"Complete secure payment within the 15-minute hold.":"Opens after the hotel confirms taxes and payment setup."}</small></span></label></fieldset>
    <p>Continuing saves a reservation and your contact details for hotel follow-up. Read the <Link href="/policies/booking-terms">booking terms</Link> and <Link href="/policies/privacy">privacy notice</Link>.</p>
    <button className="button button-primary" disabled={busy} type="submit">{busy?"Reserving…":kind==="tentative"?"Reserve tentatively":"Continue to secure payment"}</button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
