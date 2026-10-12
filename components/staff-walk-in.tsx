"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BedDouble } from "lucide-react";
import type { HotelOperationsData, StaffStay } from "@/lib/staff-types";
import type { InventoryChoice, Reservation } from "@/lib/reservations";
import { formatInr } from "@/lib/rates";
import { addHotelDays, formatHotelDate, hotelToday } from "@/lib/stay";
import { sourceLabels, StaffCheckIn } from "./staff-check-in";
import { StaffHeading, StaffNotice, StaffStatus, useStaffRequest } from "./staff-ui";
import { bookingSources } from "@/lib/staff-types";
import { normaliseGuestPhone } from "@/lib/guest-details";

type Availability = { choices: InventoryChoice[]; rooms: { number: string; category: string; housekeeping: string }[] };
type GuestDraft = { fullName: string; phone: string; email: string; address: string; nationality: string; adults: number; children: number; source: string; sourceOther?: string; otaReference?: string };

export function StaffWalkIn({ data, onBack, onComplete, roomNumber }: { data: HotelOperationsData; onBack?: () => void; onComplete?: () => void; roomNumber?: string }) {
  const router = useRouter();
  const request = useStaffRequest();
  const [step, setStep] = useState(1), [pending, setPending] = useState(false), submitting = useRef(false);
  const [message, setMessage] = useState("");
  const [dates, setDates] = useState({ checkIn: hotelToday(), checkOut: addHotelDays(hotelToday(), 1), guests: 1 });
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [room, setRoom] = useState(roomNumber || "");
  const [guest, setGuest] = useState<GuestDraft | null>(null), [source, setSource] = useState("walk_in");
  const [advanceValue, setAdvanceValue] = useState("0"), [advanceMethod, setAdvanceMethod] = useState("cash");
  const [created, setCreated] = useState<Reservation | null>(null);
  const completed = () => { if (onComplete) onComplete(); else { router.replace(created ? `/staff/stays/${created.id}` : "/staff/operations"); router.refresh(); } };
  const [requestId] = useState(() => crypto.randomUUID());
  const selectedRoom = availability?.rooms.find(value => value.number === room);
  const selectedChoice = availability?.choices.find(value => value.code === selectedRoom?.category);
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    const fields = new FormData(event.currentTarget), value = { checkIn: String(fields.get("checkIn")), checkOut: String(fields.get("checkOut")), guests: Number(fields.get("guests")) };
    submitting.current = true; setPending(true); setMessage("");
    try { const result = await request<{ data: Availability }>("/api/staff/availability", value); setDates(value); setAvailability(result.data); setStep(2); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not check availability."); }
    finally { submitting.current = false; setPending(false); }
  }
  function saveGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    const phone = normaliseGuestPhone(String(fields.get("phone") || "").trim());
    if (!phone) { setMessage("Enter a 10-digit Indian mobile number or an international number with its country code."); return; }
    const value: GuestDraft = { fullName: String(fields.get("fullName")).trim(), phone, email: String(fields.get("email") || "").trim(), address: String(fields.get("address") || "").trim(), nationality: String(fields.get("nationality") || "Indian").trim(), adults: Number(fields.get("adults")), children: Number(fields.get("children")), source };
    if (value.adults + value.children !== dates.guests) { setMessage(`Adults and children must add up to ${dates.guests} guests.`); return; }
    if (source === "other") value.sourceOther = String(fields.get("sourceOther") || "").trim();
    if (!["walk_in", "direct_website", "phone"].includes(source)) value.otaReference = String(fields.get("otaReference") || "").trim();
    setGuest(value); setMessage(""); setStep(4);
  }
  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!guest || !selectedRoom || submitting.current) return;
    const fields = new FormData(event.currentTarget);
    const advance = Math.round(Number(fields.get("advance") || 0) * 100);
    submitting.current = true; setPending(true); setMessage("");
    try {
      const input: Record<string, unknown> = { action: "walk_in", requestId, roomNumber: selectedRoom.number, ...dates, ...guest, advancePaise: advance };
      if (advance > 0) { input.advanceMethod = fields.get("method"); input.advanceReference = String(fields.get("reference") || "").trim(); }
      const result = await request<{ data: Reservation | { reservation: Reservation } }>("/api/staff/operations", input);
      const booking = "reservation" in result.data ? result.data.reservation : result.data;
      if (!booking?.id) throw new Error("The booking was saved but its details could not be loaded. Refresh the dashboard before trying again.");
      setCreated(booking); setStep(5);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the walk-in."); }
    finally { submitting.current = false; setPending(false); }
  }
  if (created && guest) {
    const draft: Partial<StaffStay> = { address: guest.address, nationality: guest.nationality, adults: guest.adults, children: guest.children, source: guest.source as StaffStay["source"], source_other: guest.sourceOther || null, ota_reference: guest.otaReference || null };
    return <><StaffNotice>Room {room} is reserved. Add the guest ID to complete check-in. Any advance is already recorded.</StaffNotice><StaffCheckIn data={data} reservation={created} assignedRooms={[room]} defaultSource="walk_in" draft={draft} onBack={completed} onComplete={completed} /></>;
  }
  return <div className="staff-walk-in">
    <StaffHeading title="New walk-in" back={() => { if (pending) return; if (step === 1) (onBack || (() => router.replace("/staff/operations")))(); else { setMessage(""); setStep(step - 1); } }} />
    <ol className="staff-stepper" aria-label="Walk-in steps">{["Stay", "Room", "Guest", "Advance"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
    <StaffNotice error>{message}</StaffNotice>
    {step === 1 && <form className="staff-form" onSubmit={search}>
      <h3>When are they staying?</h3><label>Check-in<input type="date" name="checkIn" min={hotelToday()} value={dates.checkIn} onChange={event => setDates(value => ({ ...value, checkIn: event.target.value, checkOut: value.checkOut <= event.target.value ? addHotelDays(event.target.value, 1) : value.checkOut }))} required /></label><label>Check-out<input type="date" name="checkOut" min={addHotelDays(dates.checkIn, 1)} value={dates.checkOut} onChange={event => setDates(value => ({ ...value, checkOut: event.target.value }))} required /></label><label>Guests in this room<input name="guests" type="number" inputMode="numeric" min={1} max={6} defaultValue={dates.guests} required /></label>
      <p className="staff-help">Availability includes direct website bookings and other saved reservations.</p><div className="staff-sticky-action"><button className="staff-primary" disabled={pending || !data.staffCoreReady}>{pending ? "Checking rooms…" : "Find a room"}<ArrowRight size={18} aria-hidden="true" /></button></div>
    </form>}
    {step === 2 && <div><h3>Pick an available room</h3><p>{formatHotelDate(dates.checkIn)} — {formatHotelDate(dates.checkOut)} · {dates.guests} guest{dates.guests === 1 ? "" : "s"}</p>
      <div className="staff-room-picker">{availability?.rooms.filter(value => { const choice = availability.choices.find(item => item.code === value.category); return choice && choice.capacity >= dates.guests && choice.availableRooms > 0 && value.housekeeping !== "out_of_service"; }).map(value => {
        const choice = availability.choices.find(item => item.code === value.category);
        return <button type="button" key={value.number} className={`staff-pick-room${room === value.number ? " is-picked" : ""}`} aria-pressed={room === value.number} onClick={() => setRoom(value.number)}><BedDouble size={22} aria-hidden="true" /><span>Room {value.number}<small>{choice?.name}</small><StaffStatus value={value.housekeeping} /><small>{formatInr(choice?.quote.totalPaise || 0)}{choice?.quote.taxConfirmed ? " total" : " + tax pending"}</small></span></button>;
      })}</div>
      {availability?.rooms.length === 0 && <StaffNotice>No rooms are available for these dates. Go back and choose another stay.</StaffNotice>}
      <div className="staff-sticky-action"><button className="staff-primary" disabled={!selectedRoom} onClick={() => setStep(3)}>Guest details<ArrowRight size={18} aria-hidden="true" /></button></div>
    </div>}
    {step === 3 && <form className="staff-form" onSubmit={saveGuest}><h3>Who is staying?</h3>
      <label>Full name<input name="fullName" autoComplete="name" minLength={2} maxLength={120} defaultValue={guest?.fullName || ""} required /></label><label>Phone number<input name="phone" type="tel" autoComplete="tel" maxLength={20} defaultValue={guest?.phone || ""} placeholder="+91 98765 43210" required /></label><label>Email (optional)<input name="email" type="email" autoComplete="email" maxLength={254} defaultValue={guest?.email || ""} /></label>
      <label>Home address<textarea name="address" autoComplete="street-address" minLength={5} maxLength={1000} defaultValue={guest?.address || ""} required /></label><label>Nationality<input name="nationality" minLength={2} maxLength={80} defaultValue={guest?.nationality || "Indian"} required /></label>
      <div className="staff-field-pair"><label>Adults<input name="adults" type="number" inputMode="numeric" min={1} max={6} defaultValue={guest?.adults || dates.guests} required /></label><label>Children<input name="children" type="number" inputMode="numeric" min={0} max={5} defaultValue={guest?.children || 0} required /></label></div>
      <label>Booked through<select value={source} onChange={event => setSource(event.target.value)}>{bookingSources.map(value => <option key={value} value={value}>{sourceLabels[value]}</option>)}</select></label>
      {source === "other" && <label>Source name<input name="sourceOther" defaultValue={guest?.sourceOther || ""} maxLength={100} required /></label>}{!["walk_in", "direct_website", "phone"].includes(source) && <label>OTA reference<input name="otaReference" defaultValue={guest?.otaReference || ""} maxLength={120} /></label>}
      <p className="staff-help">ID details and private camera photos are captured at check-in.</p><div className="staff-sticky-action"><button className="staff-primary">Advance payment<ArrowRight size={18} aria-hidden="true" /></button></div>
    </form>}
    {step === 4 && guest && <form className="staff-form" onSubmit={reserve}><h3>Record the advance</h3>
      <div className="staff-card"><strong>Room {room} · {guest.fullName}</strong><p>{formatHotelDate(dates.checkIn)} — {formatHotelDate(dates.checkOut)}</p><p className="staff-price">{formatInr(selectedChoice?.quote.totalPaise || 0)}{selectedChoice?.quote.taxConfirmed ? " total" : " + tax pending"}</p></div>
      <label>Advance received (₹)<input name="advance" type="number" inputMode="decimal" min={0} max={(selectedChoice?.quote.totalPaise || 100000000) / 100} step="0.01" value={advanceValue} onChange={event => setAdvanceValue(event.target.value)} required /></label><label>Payment method<select name="method" value={advanceMethod} onChange={event => setAdvanceMethod(event.target.value)}><option value="cash">Cash</option><option value="card_terminal">Card on hotel machine</option><option value="upi_manual">UPI to hotel account</option></select></label><label>Payment reference (for card / UPI)<input name="reference" autoComplete="off" maxLength={120} required={Number(advanceValue) > 0 && advanceMethod !== "cash"} /></label>
      <p className="staff-help">Enter only money already received. Your staff account is recorded with the payment.</p><div className="staff-sticky-action"><button className="staff-primary" disabled={pending}>{pending ? "Saving walk-in…" : "Save & continue to check-in"}<ArrowRight size={18} aria-hidden="true" /></button></div>
    </form>}
  </div>;
}
