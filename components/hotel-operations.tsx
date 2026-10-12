"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, LogIn, LogOut, Home, Plus, RefreshCw, CalendarDays, Phone, UsersRound, Settings, ChevronRight } from "lucide-react";
import { formatInr } from "@/lib/rates";
import { categoryLabels, type Reservation } from "@/lib/reservations";
import { formatHotelDate, hotelToday } from "@/lib/stay";
import type { HotelOperationsData, StaffRoom } from "@/lib/staff-types";
import { StaffHeading, StaffNotice, StaffStatus, staffTimestamp, useStaffRequest } from "./staff-ui";
import { sourceLabels } from "./staff-check-in";

export type { HotelOperationsData } from "@/lib/staff-types";
export type StaffOperationsView = "home" | "arrivals" | "in_house" | "departures" | "rooms" | "bookings" | "payment_reviews" | "calls" | "rates" | "settings";

export function HotelOperations({ data, initialView = "home" }: { data: HotelOperationsData; initialView?: StaffOperationsView }) {
  const router = useRouter(), request = useStaffRequest();
  const [view, setView] = useState<StaffOperationsView>(initialView);
  const [busy, setBusy] = useState(false), saving = useRef(false);
  const [notice, setNotice] = useState({ text: "", error: false });
  const [query, setQuery] = useState(""), [status, setStatus] = useState("all");
  const [roomNumber, setRoomNumber] = useState<string | null>(null), [housekeeper, setHousekeeper] = useState("");
  useEffect(() => {
    const refresh = () => { if (!saving.current && document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [router]);
  function navigate(next: StaffOperationsView) { setView(next); setRoomNumber(null); setNotice({ text: "", error: false }); }
  async function change(input: Record<string, unknown>, text = "Saved.") {
    if (saving.current) return;
    saving.current = true; setBusy(true); setNotice({ text: "", error: false });
    try { await request("/api/staff/operations", input); setNotice({ text, error: false }); router.refresh(); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not save this change.", error: true }); }
    finally { saving.current = false; setBusy(false); }
  }
  function season(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void change({ action: "season", name: form.get("name"), startsOn: form.get("startsOn"), endsOn: form.get("endsOn"), soloPaise: Math.round(Number(form.get("solo")) * 100), couplePaise: Math.round(Number(form.get("couple")) * 100), perGuestPaise: Math.round(Number(form.get("perGuest")) * 100) }, "Seasonal rate published.");
  }
  function settings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const input: Record<string, unknown> = { action: "settings", taxRateBps: Math.round(Number(form.get("tax")) * 100), checkInTime: form.get("checkInTime"), checkOutTime: form.get("checkOutTime"), cancellationTerms: form.get("cancellationTerms"), paymentsEnabled: form.get("paymentsEnabled") === "on" };
    if (data.staffCoreReady) { input.legalName = String(form.get("legalName") || "").trim(); input.legalAddress = String(form.get("legalAddress") || "").trim(); input.gstin = String(form.get("gstin") || "").trim(); }
    void change(input, "Hotel settings saved.");
  }
  const today = hotelToday();
  const staysById = new Map((data.stays || []).map(stay => [stay.reservation_id, stay]));
  const foliosById = new Map((data.folios || []).map(folio => [folio.reservation_id, folio]));
  const arrivals = data.reservations.filter(value => value.check_in === today && ["tentative", "payment_pending", "confirmed"].includes(value.status));
  const inHouse = data.reservations.filter(value => value.status === "checked_in");
  const departures = inHouse.filter(value => (staysById.get(value.id)?.expected_check_out || value.check_out) <= today);
  const dirty = data.rooms.filter(room => room.housekeeping === "dirty").length;
  const search = query.trim().toLowerCase();
  const paymentReviews = data.reservations.filter(value => value.status === "payment_review" || value.payment_review_reason || data.balanceRequests?.some(payment => payment.reservation_id === value.id && payment.review_reason) || (foliosById.get(value.id)?.credit_paise || 0) > 0 || (foliosById.get(value.id)?.paid_paise ?? value.paid_paise) > (foliosById.get(value.id)?.total_paise ?? value.total_paise));
  const visibleReservations = (view === "arrivals" ? arrivals : view === "in_house" ? inHouse : view === "departures" ? departures : view === "payment_reviews" ? paymentReviews : data.reservations).filter(value => (view !== "bookings" || status === "all" || value.status === status) && [value.reference, value.full_name, value.email, value.phone].some(item => item.toLowerCase().includes(search)));
  const followUps = data.reservations.filter(value => value.check_out >= today && ["tentative", "confirmed", "payment_review"].includes(value.status));
  const selectedRoom = data.rooms.find(room => room.number === roomNumber);
  const housekeepers = (data.staffMembers || []).filter(member => member.role === "housekeeping" && member.active);
  function roomBooking(room: StaffRoom) {
    return data.reservations.find(value => value.id === room.reservation_id) || data.reservations.find(value => data.assignments.some(assignment => assignment.room_number === room.number && assignment.reservation_id === value.id) && ["confirmed", "checked_in"].includes(value.status) && value.check_in <= today && value.check_out >= today);
  }
  function occupancy(room: StaffRoom) {
    if (room.occupancy) return room.occupancy;
    const booking = roomBooking(room);
    return booking?.status === "checked_in" ? booking.check_out <= today ? "departing_today" : "occupied" : booking?.check_in === today ? "arriving_today" : "vacant";
  }
  function bookingCard(booking: Reservation) {
    const assigned = data.assignments.filter(value => value.reservation_id === booking.id).map(value => value.room_number);
    const stay = staysById.get(booking.id);
    return <Link href={`/staff/stays/${booking.id}`} className="staff-booking-card" key={booking.id}><div className="staff-title-row"><h3>{booking.full_name}</h3><ChevronRight size={22} aria-hidden="true" /></div><StaffStatus value={booking.status} /><p>{assigned.length ? `Room ${assigned.join(", ")}` : categoryLabels[booking.category]} · {booking.guests} guests</p><p>{formatHotelDate(booking.check_in)} — {formatHotelDate(stay?.expected_check_out || booking.check_out)}</p><p>{booking.reference}</p></Link>;
  }
  return <div className="hotel-operations staff-app">
    <div className="staff-refresh-row"><span>{formatHotelDate(today)} · Hotel Teesta</span><button type="button" disabled={busy} onClick={() => router.refresh()}><RefreshCw size={18} aria-hidden="true" /> Refresh</button></div>
    <StaffNotice error={notice.error}>{notice.text}</StaffNotice>
    {!data.staffCoreReady && <StaffNotice>Bookings and inventory are connected. The new staff tools will open after the database update is installed.</StaffNotice>}
    {view === "home" && <>
      <h2 className="staff-today-heading">Today at the hotel</h2>
      {paymentReviews.length > 0 && <StaffNotice error><p>{paymentReviews.length} payment{paymentReviews.length === 1 ? " needs" : "s need"} review.</p><button type="button" onClick={() => navigate("payment_reviews")}>Review payments</button></StaffNotice>}
      <div className="staff-home-grid">{[{ value: "arrivals", label: "Arrivals", count: arrivals.length, Icon: LogIn }, { value: "in_house", label: "In-house", count: inHouse.length, Icon: BedDouble }, { value: "departures", label: "Departures", count: departures.length, Icon: LogOut }, { value: "rooms", label: "Rooms", count: data.rooms.length, Icon: Home }].map(item => <button type="button" key={item.value} onClick={() => navigate(item.value as StaffOperationsView)}><item.Icon size={26} aria-hidden="true" /><strong>{item.count}</strong><span>{item.label}</span>{item.value === "rooms" && <small>{dirty} dirty</small>}</button>)}</div>
      <Link className={`staff-primary${data.staffCoreReady ? "" : " staff-disabled"}`} href={data.staffCoreReady ? "/staff/walk-in" : "#"} aria-disabled={!data.staffCoreReady} onClick={event => { if (!data.staffCoreReady) event.preventDefault(); }}><Plus size={22} aria-hidden="true" /> New walk-in</Link>
      <div className="staff-home-links"><button type="button" onClick={() => navigate("calls")}><Phone size={20} aria-hidden="true" /> Guest call list <ChevronRight size={20} aria-hidden="true" /></button><button type="button" onClick={() => navigate("bookings")}><CalendarDays size={20} aria-hidden="true" /> All bookings <ChevronRight size={20} aria-hidden="true" /></button>{data.role === "manager" && <><Link href="/staff/team"><UsersRound size={20} aria-hidden="true" /> Staff <ChevronRight size={20} aria-hidden="true" /></Link><button type="button" onClick={() => navigate("rates")}><CalendarDays size={20} aria-hidden="true" /> Seasonal rates <ChevronRight size={20} aria-hidden="true" /></button><button type="button" onClick={() => navigate("settings")}><Settings size={20} aria-hidden="true" /> Hotel settings <ChevronRight size={20} aria-hidden="true" /></button></>}</div>
      <p className="staff-help">Saved in Supabase. Refreshes every 30 seconds while this page is visible.</p>
    </>}
    {["arrivals", "in_house", "departures", "bookings", "payment_reviews"].includes(view) && <>
      <StaffHeading title={view === "payment_reviews" ? "Payment review" : view === "in_house" ? "In-house" : view === "bookings" ? "All bookings" : view === "departures" ? "Departures today" : "Arrivals today"} back={() => navigate("home")} />
      <div className="staff-filters"><label>Search guest or booking<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>{view === "bookings" && <label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{["tentative", "payment_pending", "confirmed", "checked_in", "checked_out", "cancelled", "expired", "payment_review"].map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>}</div>
      {visibleReservations.length ? <div className="staff-booking-list">{visibleReservations.map(bookingCard)}</div> : <div className="staff-empty"><h3>No bookings in this view</h3><p>Choose another view or clear the search.</p></div>}
      {view === "bookings" && <p className="staff-help">Latest 500 bookings, including past stays.</p>}
    </>}
    {view === "rooms" && <>
      <StaffHeading title={selectedRoom ? `Room ${selectedRoom.number}` : "Rooms"} back={() => selectedRoom ? setRoomNumber(null) : navigate("home")} />
      {selectedRoom ? <div className="staff-room-actions"><div className="staff-card"><h3>{categoryLabels[selectedRoom.category]}</h3><div className="staff-room-chips"><StaffStatus value={selectedRoom.housekeeping} /><StaffStatus value={occupancy(selectedRoom)} /></div>{roomBooking(selectedRoom) && <Link className="staff-primary" href={`/staff/stays/${roomBooking(selectedRoom)!.id}`}>{roomBooking(selectedRoom)!.status === "checked_in" ? "Open stay & check out" : "Open booking & check in"}</Link>}{!roomBooking(selectedRoom) && selectedRoom.active && selectedRoom.housekeeping !== "out_of_service" && <Link className="staff-primary" href={`/staff/walk-in?room=${selectedRoom.number}`}>New walk-in in this room</Link>}</div>
        {selectedRoom.housekeeping !== "clean" && <form className="staff-form staff-card" onSubmit={event => { event.preventDefault(); const input: Record<string, unknown> = { action: "housekeeping", roomNumber: selectedRoom.number, status: "clean" }; if (housekeeper) input.housekeeperId = housekeeper; void change(input, selectedRoom.housekeeping === "dirty" ? "Key received. Room is clean." : "Room is clean."); }}><h3>{selectedRoom.housekeeping === "dirty" ? "Key received, room clean" : "Room clean"}</h3><label>{selectedRoom.housekeeping === "dirty" ? "Housekeeper who returned the key" : "Housekeeper (optional for room setup)"}<select value={housekeeper} onChange={event => setHousekeeper(event.target.value)} required={selectedRoom.housekeeping === "dirty"}><option value="">Choose housekeeper</option>{housekeepers.map(member => <option key={member.user_id} value={member.user_id}>{member.name || member.username}</option>)}</select></label>{housekeepers.length === 0 && selectedRoom.housekeeping === "dirty" && <p className="staff-help">{data.role === "manager" ? <Link href="/staff/team">Add a housekeeper in Staff first.</Link> : "Ask the manager to add a housekeeper in Staff first."}</p>}<button className="staff-primary" disabled={busy || !data.staffCoreReady || (selectedRoom.housekeeping === "dirty" && !housekeeper)}>{selectedRoom.housekeeping === "dirty" ? "Key received, room clean" : "Room clean"}</button></form>}
        {selectedRoom.housekeeping !== "out_of_service" && <details className="staff-card"><summary>Take room out of service</summary><p>Bookable capacity is checked before saving. Existing stays cannot be displaced.</p><button type="button" className="staff-danger" disabled={busy} onClick={() => void change({ action: "housekeeping", roomNumber: selectedRoom.number, status: "out_of_service" }, "Room taken out of service.")}>Mark out of service</button></details>}
        {selectedRoom.housekeeping === "clean" && <details className="staff-card"><summary>Room needs cleaning</summary><button type="button" disabled={busy} onClick={() => void change({ action: "housekeeping", roomNumber: selectedRoom.number, status: "dirty" }, "Room marked dirty.")}>Mark room dirty</button></details>}
      </div> : <><div className="staff-room-legend"><StaffStatus value="clean" /><StaffStatus value="dirty" /><StaffStatus value="out_of_service" /></div><p className="staff-help">{data.rooms.length} rooms · {dirty} dirty. Tap a room for its actions.</p><div className="staff-room-grid">{data.rooms.map(room => <button type="button" key={room.number} className={`staff-room-tile staff-room-${room.housekeeping} staff-occupancy-${occupancy(room)}`} onClick={() => { setRoomNumber(room.number); setHousekeeper(""); }}><strong>{room.number}</strong><span>{categoryLabels[room.category]}</span><StaffStatus value={room.housekeeping} /><StaffStatus value={occupancy(room)} />{room.checked_in_at && <small>In: {staffTimestamp(room.checked_in_at)}</small>}{room.expected_check_out && <small>Out: {formatHotelDate(room.expected_check_out)}</small>}{room.source && <small>{sourceLabels[room.source]}</small>}</button>)}</div></>}
    </>}
    {view === "calls" && <><StaffHeading title="Guest call list" back={() => navigate("home")} /><p className="staff-lead">Follow up on tentative stays, upcoming arrivals and payments needing review.</p>{followUps.length ? <div className="staff-booking-list">{followUps.map(booking => <article className="staff-card" key={booking.id}><h3>{booking.full_name}</h3><StaffStatus value={booking.status} /><p>{formatHotelDate(booking.check_in)} · {booking.reference}</p><a className="staff-primary" href={`tel:${booking.phone}`}><Phone size={20} aria-hidden="true" /> Call {booking.phone}</a><Link href={`/staff/stays/${booking.id}`}>Open booking</Link></article>)}</div> : <div className="staff-empty"><p>No guest follow-ups yet.</p></div>}</>}
    {view === "rates" && data.role === "manager" && <><StaffHeading title="Seasonal rates" back={() => navigate("home")} /><p className="staff-lead">Saved bookings keep their agreed price. Overlapping active seasons are rejected.</p><div className="staff-booking-list">{data.seasons.filter(value => value.active).map(value => <article className="staff-card" key={value.id}><h3>{value.name}</h3><p>{formatHotelDate(value.starts_on)} — {formatHotelDate(value.ends_on)} (end date excluded)</p><p>Solo {formatInr(value.solo_paise)} · Couple {formatInr(value.couple_paise)}</p><p>Groups {formatInr(value.group_per_guest_paise)} per guest</p></article>)}</div><form className="staff-form staff-card" onSubmit={season}><h3>Add a seasonal rate</h3><label>Season name<input name="name" required minLength={2} maxLength={80} /></label><label>Starts on<input name="startsOn" type="date" required /></label><label>Ends on (exclusive)<input name="endsOn" type="date" required /></label><label>Solo rate (₹)<input name="solo" type="number" inputMode="decimal" min={1} step="0.01" required /></label><label>Couple rate (₹)<input name="couple" type="number" inputMode="decimal" min={1} step="0.01" required /></label><label>Group rate per guest (₹)<input name="perGuest" type="number" inputMode="decimal" min={1} step="0.01" required /></label><button className="staff-primary" disabled={busy}>Publish seasonal rate</button></form></>}
    {view === "settings" && data.role === "manager" && <><StaffHeading title="Hotel settings" back={() => navigate("home")} /><p className="staff-lead">Save the hotel’s approved legal details, tax treatment and policies. Provider credentials are configured separately.</p><div className="staff-provider-list staff-card"><p>Email reminders: {data.emailReady ? "configured" : "setup required"}</p><p>Reminder scheduler: {data.schedulerReady ? "configured" : "secret required"}</p><p>Razorpay: {data.paymentReady ? "configured" : "setup required"}</p></div><form className="staff-form" onSubmit={settings}>
      {data.staffCoreReady && <fieldset disabled={busy}><legend>Invoice details</legend><label>Legal hotel name<input name="legalName" maxLength={200} required defaultValue={data.settings.legal_name || ""} /></label><label>Hotel address<textarea name="legalAddress" maxLength={1000} required defaultValue={data.settings.legal_address || ""} /></label><label>GSTIN (if registered)<input name="gstin" autoCapitalize="characters" maxLength={15} defaultValue={data.settings.gstin || ""} /></label></fieldset>}
      <label>Approved tax rate (%)<input name="tax" type="number" inputMode="decimal" min={0} max={100} step="0.01" required defaultValue={data.settings.tax_rate_bps === null ? "" : data.settings.tax_rate_bps / 100} /></label><p className="staff-help">Confirm the applicable rate and registration details before enabling invoices or online payment.</p><label>Check-in time<input name="checkInTime" type="time" required defaultValue={data.settings.check_in_time?.slice(0, 5) || ""} /></label><label>Check-out time<input name="checkOutTime" type="time" required defaultValue={data.settings.check_out_time?.slice(0, 5) || ""} /></label><label>Approved cancellation terms<textarea name="cancellationTerms" required minLength={20} maxLength={5000} defaultValue={data.settings.cancellation_terms || ""} /></label><label className="staff-checkbox"><input type="checkbox" name="paymentsEnabled" defaultChecked={data.settings.payments_enabled} /> Enable payments after provider verification</label><div className="staff-sticky-action"><button className="staff-primary" disabled={busy}>Save hotel settings</button></div></form></>}
    <nav className="staff-bottom-nav staff-print-hide" aria-label="Front desk navigation"><button type="button" aria-current={view === "home" ? "page" : undefined} onClick={() => navigate("home")}><Home size={22} aria-hidden="true" /> Home</button><button type="button" aria-current={view === "rooms" ? "page" : undefined} onClick={() => navigate("rooms")}><BedDouble size={22} aria-hidden="true" /> Rooms</button><button type="button" aria-current={view === "bookings" ? "page" : undefined} onClick={() => navigate("bookings")}><CalendarDays size={22} aria-hidden="true" /> Bookings</button></nav>
  </div>;
}
