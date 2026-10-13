"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserRound, BedDouble } from "lucide-react";
import type { HotelOperationsData } from "@/lib/staff-types";
import { bookingSources } from "@/lib/staff-types";
import type { InventoryChoice } from "@/lib/reservations";
import { categoryLabels } from "@/lib/reservations";
import { normaliseGuestPhone } from "@/lib/guest-details";
import { addHotelDays, hotelToday } from "@/lib/stay";
import { formatInr } from "@/lib/rates";
import { idTypes, sourceLabels, StaffCheckIn } from "./staff-check-in";
import { StaffStay } from "./staff-stay";
import { StaffHeading, StaffNotice, StaffStatus, useStaffRequest } from "./staff-ui";

export function StaffRoomDashboard({ data, roomNumber, onBack }: { data: HotelOperationsData; roomNumber: string; onBack?: () => void }) {
  const router = useRouter(), request = useStaffRequest();
  const room = data.rooms.find(value => value.number === roomNumber);
  const capacity = data.categories.find(value => value.code === room?.category)?.capacity || 1;
  const today = hotelToday();
  const [dates, setDates] = useState({ checkIn: today, checkOut: addHotelDays(today, 1), guests: 1 });
  const [nationality, setNationality] = useState("Indian"), [source, setSource] = useState("walk_in"), [idType, setIdType] = useState("aadhaar");
  const [advance, setAdvance] = useState("0"), [advanceMethod, setAdvanceMethod] = useState("cash");
  const [housekeeper, setHousekeeper] = useState("");
  const [pending, setPending] = useState(false), saving = useRef(false);
  const [message, setMessage] = useState({ text: "", error: false });
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [completedId, setCompletedId] = useState<string | null>(null);
  const quoteKey = `${dates.checkIn}|${dates.checkOut}|${dates.guests}|${room?.category || ""}`;
  const [quoteResult, setQuoteResult] = useState<{ key: string; choice?: InventoryChoice; error?: string } | null>(null);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const quote = quoteResult?.key === quoteKey ? quoteResult.choice?.quote : undefined;
  const rateReady = Boolean(quote && quoteResult?.choice && quoteResult.choice.availableRooms > 0);
  const booking = data.reservations.find(value => value.id === (room?.reservation_id || completedId) && ["confirmed", "checked_in"].includes(value.status)) || data.reservations.find(value => ["confirmed", "checked_in"].includes(value.status) && value.check_in <= today && value.check_out >= today && data.assignments.some(assignment => assignment.reservation_id === value.id && assignment.room_number === roomNumber));
  const waiting = Boolean(completedId && !data.reservations.some(value => value.id === completedId));
  const occupiedWithoutBooking = Boolean(!booking && room && ["occupied", "departing_today", "arriving_today"].includes(room.occupancy));
  const ready = Boolean(data.staffCoreReady && room?.active && room.housekeeping === "clean" && !booking && !occupiedWithoutBooking);
  const foreign = !["indian", "india", "in"].includes(nationality.trim().toLowerCase());
  const housekeepers = (data.staffMembers || []).filter(value => value.active && value.role === "housekeeping");
  const back = onBack || (() => router.replace("/staff/operations"));
  useEffect(() => {
    if (!ready || dates.checkOut <= dates.checkIn || dates.guests < 1 || dates.guests > capacity) return;
    let current = true;
    const timer = window.setTimeout(() => {
      void request<{ data: { choices: InventoryChoice[] } }>("/api/staff/availability", dates).then(result => {
        if (current) setQuoteResult({ key: quoteKey, choice: result.data.choices.find(value => value.code === room?.category) });
      }).catch(error => { if (current) setQuoteResult({ key: quoteKey, error: error instanceof Error ? error.message : "Could not load the rate." }); });
    }, 300);
    return () => { current = false; window.clearTimeout(timer); };
  }, [ready, dates, quoteKey, room?.category, capacity, request, quoteAttempt]);
  async function roomStatus(status: "clean" | "dirty" | "out_of_service") {
    if (saving.current) return;
    saving.current = true; setPending(true); setMessage({ text: "", error: false });
    try {
      const input: Record<string, unknown> = { action: "housekeeping", roomNumber, status };
      if (status === "clean" && housekeeper) input.housekeeperId = housekeeper;
      await request("/api/staff/operations", input); setMessage({ text: status === "clean" ? "Room clean. The guest can check in." : "Room status saved.", error: false }); router.refresh();
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : "Could not save the room status.", error: true }); }
    finally { saving.current = false; setPending(false); }
  }
  async function checkIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving.current || !ready || !rateReady) return;
    const fields = new FormData(event.currentTarget), phone = normaliseGuestPhone(String(fields.get("phone") || ""));
    if (!phone) { setMessage({ text: "Enter a 10-digit Indian mobile number or a phone number with its country code.", error: true }); return; }
    const adults = Number(fields.get("adults")), children = Number(fields.get("children"));
    if (adults + children !== dates.guests) { setMessage({ text: `Adults and children must add up to ${dates.guests} guests.`, error: true }); return; }
    saving.current = true; setPending(true); setMessage({ text: "", error: false });
    try {
      const input: Record<string, unknown> = { action: "room_check_in", requestId, roomNumber, ...dates, fullName: String(fields.get("fullName") || "").trim(), phone, email: String(fields.get("email") || "").trim(), address: String(fields.get("address") || "").trim(), nationality: nationality.trim(), adults, children, idType, idNumber: String(fields.get("idNumber") || "").trim(), source, advancePaise: Math.round(Number(advance || 0) * 100) };
      if (source === "other") input.sourceOther = String(fields.get("sourceOther") || "").trim();
      if (!["walk_in", "phone", "direct_website"].includes(source)) input.otaReference = String(fields.get("otaReference") || "").trim();
      if (foreign) { input.passportNumber = String(fields.get("passportNumber") || "").trim(); input.visaNumber = String(fields.get("visaNumber") || "").trim(); input.visaExpiry = fields.get("visaExpiry"); }
      if (Number(advance) > 0) { input.advanceMethod = advanceMethod; if (advanceMethod !== "cash") input.advanceReference = String(fields.get("advanceReference") || "").trim(); }
      const result = await request<{ data: { id?: string; reservationId?: string; reservation?: { id: string } } }>("/api/staff/operations", input);
      const id = result.data.reservationId || result.data.reservation?.id || result.data.id;
      if (!id) throw new Error("Check-in was saved but its details could not be loaded. Refresh this room before trying again.");
      setCompletedId(id);
      setRequestId(crypto.randomUUID()); setMessage({ text: "Guest checked in. The profile and check-in time are saved.", error: false }); router.refresh();
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : "Check-in could not be saved.", error: true }); }
    finally { saving.current = false; setPending(false); }
  }
  if (!room) return <StaffNotice error>This room was not found. Refresh the room list.</StaffNotice>;
  return <div className="staff-room-dashboard">
    <StaffHeading title={`Room ${room.number}`} back={back}><p>{categoryLabels[room.category]} · Up to {capacity} guests</p><div className="staff-room-chips"><StaffStatus value={room.housekeeping} /><StaffStatus value={room.occupancy} /></div></StaffHeading>
    <StaffNotice error={message.error}>{message.text}</StaffNotice>
    {booking?.status === "checked_in" ? <StaffStay key={booking.id} data={data} reservation={booking} onBack={back} embedded /> : booking?.status === "confirmed" ? <StaffCheckIn key={booking.id} data={data} reservation={booking} assignedRooms={data.assignments.filter(value => value.reservation_id === booking.id).map(value => value.room_number)} onBack={back} onComplete={() => router.refresh()} /> : waiting ? <StaffNotice>Loading the checked-in guest… <button type="button" onClick={() => router.refresh()}>Refresh room</button></StaffNotice> : ready ? <>
      <div className="staff-title-row"><h3><UserRound size={22} aria-hidden="true" /> Guest registration</h3><BedDouble size={24} aria-hidden="true" /></div>
      <p className="staff-lead">Enter the guest details and tap Check in. The room, guest profile and arrival time are saved together.</p>
      <form className="staff-form" onSubmit={checkIn}>
        <fieldset disabled={pending}><legend>Stay</legend><label>Arrival date<input type="date" min={today} max={today} value={dates.checkIn} onChange={event => setDates(value => ({ ...value, checkIn: event.target.value, checkOut: value.checkOut <= event.target.value ? addHotelDays(event.target.value, 1) : value.checkOut }))} required /></label><label>Expected check-out<input type="date" min={addHotelDays(dates.checkIn, 1)} max={addHotelDays(dates.checkIn, 30)} value={dates.checkOut} onChange={event => setDates(value => ({ ...value, checkOut: event.target.value }))} required /></label><label>Guests in this room<input type="number" inputMode="numeric" min={1} max={capacity} value={dates.guests} onChange={event => setDates(value => ({ ...value, guests: Number(event.target.value) }))} required /></label><div className="staff-field-pair"><label>Adults<input key={`adults-${dates.guests}`} name="adults" type="number" min={1} max={capacity} inputMode="numeric" defaultValue={dates.guests} required /></label><label>Children<input name="children" type="number" min={0} max={Math.max(0, capacity - 1)} inputMode="numeric" defaultValue={0} required /></label></div>
          {quote ? <p className="staff-room-quote"><strong>{formatInr(quote.totalPaise)}</strong> · {quote.nights} night{quote.nights === 1 ? "" : "s"}{quote.taxConfirmed ? " including approved tax" : " + tax pending"}</p> : <p className="staff-help">{quoteResult?.key === quoteKey && quoteResult.error ? "The rate could not be loaded. Try again before checking in." : quoteResult?.key === quoteKey ? "No room in this category is available for all selected nights. Change the check-out date." : "Checking the current rate…"}</p>}{quoteResult?.key === quoteKey && quoteResult.error && <button type="button" onClick={() => { setQuoteResult(null); setQuoteAttempt(value => value + 1); }}>Retry rate check</button>}
        </fieldset>
        <fieldset disabled={pending}><legend>Guest profile</legend><label>Full name<input name="fullName" autoComplete="name" required minLength={2} maxLength={120} /></label><label>Phone number<input name="phone" type="tel" autoComplete="tel" required maxLength={24} placeholder="+91 98765 43210" /></label><label>Email (optional)<input name="email" type="email" autoComplete="email" maxLength={254} /></label><label>Home address<textarea name="address" autoComplete="street-address" minLength={5} maxLength={1000} required /></label><label>Nationality<input value={nationality} onChange={event => setNationality(event.target.value)} minLength={2} maxLength={80} required /></label></fieldset>
        <fieldset disabled={pending}><legend>ID details</legend><label>ID type<select value={idType} onChange={event => setIdType(event.target.value)}>{idTypes.map(value => <option key={value.value} value={value.value}>{value.label}</option>)}</select></label><label>{idType === "aadhaar" ? "Aadhaar number" : "ID number"}<input name="idNumber" autoComplete="off" inputMode={idType === "aadhaar" ? "numeric" : "text"} minLength={4} maxLength={80} required /></label>{idType === "aadhaar" && <p className="staff-help">Only the last four digits are shown after saving.</p>}</fieldset>
        {foreign && <fieldset disabled={pending}><legend>Foreign guest</legend><StaffNotice>File Form III (formerly Form C) through FRRO within 24 hours of arrival. Report departure within 24 hours too. <a href="https://www.indianfrro.gov.in/frro/FormC/login.jsp" target="_blank" rel="noreferrer">Open FRRO</a></StaffNotice><label>Passport number<input name="passportNumber" maxLength={80} required /></label><label>Visa number<input name="visaNumber" maxLength={80} required /></label><label>Visa expiry<input name="visaExpiry" type="date" required /></label></fieldset>}
        <fieldset disabled={pending}><legend>Booking source</legend><label>Booked through<select value={source} onChange={event => setSource(event.target.value)}>{bookingSources.map(value => <option key={value} value={value}>{sourceLabels[value]}</option>)}</select></label>{source === "other" && <label>Source name<input name="sourceOther" maxLength={100} required /></label>}{!["walk_in", "phone", "direct_website"].includes(source) && <label>OTA booking reference<input name="otaReference" maxLength={100} /></label>}</fieldset>
        <fieldset disabled={pending}><legend>Advance (optional)</legend><label>Money already received (₹)<input type="number" min={0} max={quote ? quote.totalPaise / 100 : 1000000} step="0.01" inputMode="decimal" value={advance} onChange={event => setAdvance(event.target.value)} required /></label>{Number(advance) > 0 && <><label>Method<select value={advanceMethod} onChange={event => setAdvanceMethod(event.target.value)}><option value="cash">Cash</option><option value="card_terminal">Card on hotel machine</option><option value="upi_manual">UPI to hotel account</option></select></label>{advanceMethod !== "cash" && <label>Payment reference<input name="advanceReference" maxLength={120} required /></label>}</>}<p className="staff-help">Record only money the hotel has received. Your staff account is recorded with it.</p></fieldset>
        <div className="staff-sticky-action"><button className="staff-primary" disabled={pending || !data.staffCoreReady || !rateReady}>{pending ? "Saving check-in…" : "Check in"}</button></div>
      </form>
    </> : occupiedWithoutBooking ? <StaffNotice>This room has an active stay or arrival. Refresh the room to load its guest details.</StaffNotice> : !data.staffCoreReady ? <StaffNotice>The staff update must be installed before checking in guests.</StaffNotice> : !room.active || room.housekeeping === "out_of_service" ? <StaffNotice>This room is out of service. Return it to clean status before checking in a guest.</StaffNotice> : <StaffNotice>Receive the housekeeping key and mark this room clean before checking in a guest.</StaffNotice>}
    <details className="staff-card staff-room-status-panel" open={room.housekeeping !== "clean"}><summary>Room cleaning &amp; status</summary>
      {room.housekeeping !== "clean" && <form className="staff-form" onSubmit={event => { event.preventDefault(); void roomStatus("clean"); }}><label>{room.housekeeping === "dirty" ? "Housekeeper who returned the key" : "Housekeeper (optional for room setup)"}<select value={housekeeper} onChange={event => setHousekeeper(event.target.value)} required={room.housekeeping === "dirty"}><option value="">Choose housekeeper</option>{housekeepers.map(value => <option key={value.user_id} value={value.user_id}>{value.name || value.username}</option>)}</select></label>{room.housekeeping === "dirty" && housekeepers.length === 0 && <p>{data.role === "manager" ? <Link href="/staff/team">Add a housekeeper in Staff first.</Link> : "Ask the manager to add a housekeeper in Staff first."}</p>}<button className="staff-primary" disabled={pending || !data.staffCoreReady || (room.housekeeping === "dirty" && !housekeeper)}>{room.housekeeping === "dirty" ? "Key received, room clean" : "Room clean"}</button></form>}
      {room.housekeeping === "clean" && <button type="button" disabled={pending} onClick={() => void roomStatus("dirty")}>Mark room dirty</button>}
      {room.housekeeping !== "out_of_service" && <details><summary>Take room out of service</summary><p>Existing bookings and available capacity are checked before saving.</p><button type="button" className="staff-danger" disabled={pending} onClick={() => void roomStatus("out_of_service")}>Mark out of service</button></details>}
    </details>
  </div>;
}
