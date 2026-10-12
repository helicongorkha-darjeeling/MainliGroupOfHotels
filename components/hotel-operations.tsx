"use client";
import { useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatInr } from "@/lib/rates";
import { categoryLabels,type Reservation } from "@/lib/reservations";

export type HotelOperationsData={
  role:"manager"|"reception";emailReady:boolean;paymentReady:boolean;schedulerReady:boolean;
  rooms:{number:string;category:string;active:boolean;housekeeping:string}[];
  reservations:Reservation[];categories:{code:string;name:string;capacity:number;online_enabled:boolean}[];
  assignments:{reservation_id:string;room_number:string}[];
  seasons:{id:string;name:string;starts_on:string;ends_on:string;solo_paise:number;couple_paise:number;group_per_guest_paise:number;active:boolean}[];
  settings:{tax_rate_bps:number|null;check_in_time:string|null;check_out_time:string|null;cancellation_terms:string|null;payments_enabled:boolean};
};
export function HotelOperations({data}:{data:HotelOperationsData}) {
  const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function change(input:Record<string,unknown>) {
    if(busy)return;setBusy(true);setMessage("");
    try {const response=await fetch("/api/staff/operations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});const result=await response.json();if(!response.ok)throw new Error(result.error??"Change failed.");setMessage("Saved.");router.refresh();}
    catch(error){setMessage(error instanceof Error?error.message:"Change could not be saved.");}finally{setBusy(false);}
  }
  function season(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);void change({action:"season",name:form.get("name"),startsOn:form.get("startsOn"),endsOn:form.get("endsOn"),soloPaise:Math.round(Number(form.get("solo"))*100),couplePaise:Math.round(Number(form.get("couple"))*100),perGuestPaise:Math.round(Number(form.get("perGuest"))*100)});}
  function settings(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);void change({action:"settings",taxRateBps:Math.round(Number(form.get("tax"))*100),checkInTime:form.get("checkInTime"),checkOutTime:form.get("checkOutTime"),cancellationTerms:form.get("cancellationTerms"),paymentsEnabled:form.get("paymentsEnabled")==="on"});}
  const upcoming=data.reservations.filter(b=>["tentative","confirmed","payment_review"].includes(b.status));
  return <div className="hotel-operations">
    <div className="operation-metrics"><p><strong>{data.rooms.filter(r=>r.active).length}</strong> active rooms</p><p><strong>{data.reservations.filter(b=>b.status==="tentative").length}</strong> tentative holds</p><p><strong>{data.reservations.filter(b=>b.status==="confirmed").length}</strong> confirmed stays</p></div>
    <p className="operation-provider-status">Email: {data.emailReady?"configured":"setup required"} · Reminder scheduler: {data.schedulerReady?"configured":"secret required"} · Payments: {data.paymentReady?"credentials configured":"setup required"}</p>
    <p role="status" aria-live="polite">{message}</p>
    <section><h2>Front-desk call list</h2><p>Follow up on tentative stays, upcoming arrivals, and payments needing review. Calling is handled by reception.</p>
      {upcoming.length===0?<p>No follow-ups yet.</p>:<div className="operation-cards">{upcoming.map(b=><article key={b.id}><strong>{b.full_name} · {b.reference}</strong><p>{b.check_in} — {b.check_out} · {b.status.replaceAll("_"," ")}</p><a href={`tel:${b.phone}`}>Call {b.phone}</a><a href={`mailto:${b.email}`}>Email guest</a></article>)}</div>}
    </section>
    <section><h2>Reservations</h2><div className="operation-cards">{data.reservations.map(b=><article key={b.id}>
      <p className="eyebrow">{b.status.replaceAll("_"," ")}</p><h3>{b.reference}</h3><p>{b.full_name} · {categoryLabels[b.category]} · {b.rooms} rooms · {b.guests} guests</p><p>{b.check_in} — {b.check_out}</p><p>Total {formatInr(b.total_paise)}{b.tax_paise===null?" + taxes pending":""} · Paid {formatInr(b.paid_paise)}</p>
      <p>Assigned rooms: {data.assignments.filter(a=>a.reservation_id===b.id).map(a=>a.room_number).join(", ")||"Awaiting reception assignment"}</p>
      {b.hold_until&&<p>Hold ends {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(b.hold_until))} IST</p>}
      <div className="operation-actions">{b.status==="tentative"&&<button disabled={busy} onClick={()=>change({action:"confirm",reservationId:b.id})}>Confirm after guest follow-up</button>}
        {["tentative","payment_pending","confirmed"].includes(b.status)&&b.paid_paise===0&&<button disabled={busy} onClick={()=>change({action:"cancel",reservationId:b.id})}>Cancel unpaid reservation</button>}
        {b.status==="confirmed"&&<button disabled={busy} onClick={()=>change({action:"check_in",reservationId:b.id})}>Check in</button>}
        {b.status==="checked_in"&&<button disabled={busy} onClick={()=>change({action:"check_out",reservationId:b.id})}>Check out</button>}</div>
      {b.status==="confirmed"&&<form className="operation-assignment" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);void change({action:"assign",reservationId:b.id,rooms:String(form.get("rooms")).split(",").map(n=>n.trim()).filter(Boolean)});}}><label>Assign {b.rooms} {categoryLabels[b.category]} room numbers<input name="rooms" placeholder="301, 302" required/></label><button disabled={busy}>Save assignment</button></form>}
      {b.status==="payment_review"&&<p className="preview-alert">Captured payment needs manual resolution/refund. This booking is not confirmed.</p>}
    </article>)}</div></section>
    <section><h2>Room inventory &amp; housekeeping</h2><div className="operation-room-grid">{data.rooms.map(r=><label key={r.number}><strong>Room {r.number}</strong><span>{categoryLabels[r.category]}</span><select aria-label={`Room ${r.number} housekeeping`} value={r.housekeeping} disabled={busy} onChange={e=>change({action:"housekeeping",roomNumber:r.number,status:e.target.value})}>{["unknown","clean","dirty","out_of_service"].map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label>)}</div></section>
    {data.role==="manager"&&<section><h2>Seasonal prices</h2><p>Rates apply by stay night. Existing reservations keep the price saved when they were created. Overlapping seasons are rejected.</p>
      {data.seasons.filter(s=>s.active).map(s=><p key={s.id}>{s.name}: {s.starts_on} — {s.ends_on} · solo {formatInr(s.solo_paise)} · couple {formatInr(s.couple_paise)} · group {formatInr(s.group_per_guest_paise)}/guest</p>)}
      <form className="operation-season-form" onSubmit={season}><label>Season name<input name="name" required maxLength={80}/></label><label>Starts on<input name="startsOn" type="date" required/></label><label>Ends on (exclusive)<input name="endsOn" type="date" required/></label><label>Solo rate (₹)<input name="solo" type="number" min="1" step="1" required/></label><label>Couple rate (₹)<input name="couple" type="number" min="1" step="1" required/></label><label>Group rate per guest (₹)<input name="perGuest" type="number" min="1" step="1" required/></label><button disabled={busy}>Publish seasonal rate</button></form>
    </section>}
    {data.role==="manager"&&<section><h2>Approved launch settings</h2><p>Enter the hotel’s approved tax treatment, times and cancellation terms. A payment toggle does not substitute for working provider credentials.</p>
      <form className="operation-season-form" onSubmit={settings}><label>Approved tax rate (%)<input name="tax" type="number" min="0" max="100" step="0.01" required defaultValue={data.settings.tax_rate_bps===null?"":data.settings.tax_rate_bps/100}/></label>
      <label>Check-in time<input name="checkInTime" type="time" required defaultValue={data.settings.check_in_time?.slice(0,5)??""}/></label><label>Check-out time<input name="checkOutTime" type="time" required defaultValue={data.settings.check_out_time?.slice(0,5)??""}/></label>
      <label>Approved cancellation terms<textarea name="cancellationTerms" required minLength={20} maxLength={5000} defaultValue={data.settings.cancellation_terms??""}/></label>
      <label><input type="checkbox" name="paymentsEnabled" defaultChecked={data.settings.payments_enabled}/>Enable payments after provider verification</label><button disabled={busy}>Save approved settings</button></form></section>}
  </div>;
}
