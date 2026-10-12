"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, ShieldCheck, Check } from "lucide-react";
import type { HotelOperationsData, StaffStay } from "@/lib/staff-types";
import { bookingSources } from "@/lib/staff-types";
import type { Reservation } from "@/lib/reservations";
import { categoryLabels } from "@/lib/reservations";
import { hotelToday } from "@/lib/stay";
import { normaliseGuestPhone } from "@/lib/guest-details";
import { StaffHeading, StaffNotice, useStaffRequest } from "./staff-ui";

export const sourceLabels: Record<string, string> = { direct_website: "Direct website", walk_in: "Walk-in", phone: "Phone", makemytrip: "MakeMyTrip", goibibo: "Goibibo", booking_com: "Booking.com", agoda: "Agoda", airbnb: "Airbnb", expedia: "Expedia", other: "Other" };
const idTypes = [{ value: "aadhaar", label: "Aadhaar" }, { value: "passport", label: "Passport" }, { value: "voter_id", label: "Voter ID" }, { value: "driving_licence", label: "Driving Licence" }, { value: "pan", label: "PAN" }, { value: "other", label: "Other" }];

export function StaffCheckIn({ reservation, data, onBack, onComplete, assignedRooms, defaultSource, draft }: { reservation: Reservation; data: HotelOperationsData; onBack?: () => void; onComplete?: () => void; assignedRooms?: string[]; defaultSource?: "walk_in"; draft?: Partial<StaffStay> }) {
  const router = useRouter();
  const returnToStay = () => { router.replace(`/staff/stays/${reservation.id}`); router.refresh(); };
  const request = useStaffRequest();
  const stay = data.stays?.find(value => value.reservation_id === reservation.id) || draft;
  const assigned = assignedRooms || data.assignments.filter(value => value.reservation_id === reservation.id).map(value => value.room_number);
  const [rooms, setRooms] = useState<string[]>(assigned);
  const [nationality, setNationality] = useState(stay?.nationality || "Indian");
  const [source, setSource] = useState(stay?.source || defaultSource || "direct_website");
  const [idType, setIdType] = useState(stay?.id_type || "aadhaar");
  const [pending, setPending] = useState(false), submitting = useRef(false);
  const [notice, setNotice] = useState("");
  const [front, setFront] = useState<File | null>(null), [back, setBack] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState({ front: Boolean(stay?.id_front_path), back: Boolean(stay?.id_back_path) });
  const foreign = !["indian", "india", "in"].includes(nationality.trim().toLowerCase());
  const available = data.rooms.filter(room => room.active && room.category === reservation.category && room.housekeeping === "clean" && (!room.reservation_id || room.reservation_id === reservation.id || room.occupancy === "vacant" || room.occupancy === "arriving_today"));

  async function upload(side: "front" | "back", file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Use a JPG, PNG or WebP ID photo smaller than 5 MB.");
    const prepared = await request<{ data: { path: string; token: string; signedUrl: string } }>("/api/staff/documents", { action: "upload", reservationId: reservation.id, side, contentType: file.type, size: file.size });
    const response = await fetch(prepared.data.signedUrl, { method: "PUT", headers: { "Content-Type": file.type, "Cache-Control": "max-age=0", "x-upsert": "false" }, body: file, signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new Error(`The ${side} ID photo could not be uploaded. Please try again.`);
    await request("/api/staff/documents", { action: "register", reservationId: reservation.id, side, path: prepared.data.path });
    setUploaded(value => ({ ...value, [side]: true }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    const values = new FormData(event.currentTarget);
    const phone = normaliseGuestPhone(String(values.get("phone") || "").trim());
    if (!phone) { setNotice("Enter a 10-digit Indian mobile number or an international number with its country code."); return; }
    if (rooms.length !== reservation.rooms) { setNotice(`Choose exactly ${reservation.rooms} room${reservation.rooms === 1 ? "" : "s"}.`); return; }
    if (Number(values.get("adults")) + Number(values.get("children")) !== reservation.guests) { setNotice(`Adults and children must add up to ${reservation.guests} guests.`); return; }
    if ([front, back].some(file => file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024))) { setNotice("Use JPG, PNG or WebP ID photos smaller than 5 MB."); return; }
    submitting.current = true; setPending(true); setNotice("");
    try {
      await request("/api/staff/operations", { action: "assign", reservationId: reservation.id, rooms });
      await upload("front", front); await upload("back", back);
      const input: Record<string, unknown> = {
        action: "check_in", reservationId: reservation.id, fullName: String(values.get("fullName") || "").trim(), phone,
        email: String(values.get("email") || "").trim(), address: values.get("address"), nationality: nationality.trim(), adults: Number(values.get("adults")), children: Number(values.get("children")),
        idType, idNumber: String(values.get("idNumber") || "").trim(), source, expectedCheckOut: values.get("expectedCheckOut"),
      };
      if (source === "other") input.sourceOther = values.get("sourceOther");
      if (!["direct_website", "walk_in", "phone"].includes(source)) input.otaReference = values.get("otaReference");
      if (foreign) { input.passportNumber = values.get("passportNumber"); input.visaNumber = values.get("visaNumber"); input.visaExpiry = values.get("visaExpiry"); }
      await request("/api/staff/operations", input); (onComplete || returnToStay)();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Check-in could not be saved."); }
    finally { submitting.current = false; setPending(false); }
  }
  return <div className="staff-check-in">
    <StaffHeading title="Check in" back={onBack || returnToStay}><p>{reservation.full_name} · {reservation.reference}</p></StaffHeading>
    <p className="staff-lead">Confirm the guest details and room. The hotel records your name and the check-in time automatically.</p>
    <StaffNotice error>{notice}</StaffNotice>
    <form className="staff-form" onSubmit={submit}>
      <fieldset disabled={pending}><legend>Room &amp; stay</legend><p>{categoryLabels[reservation.category]} · {reservation.guests} guests</p>
        <div className="staff-room-picker">{available.map(room => <label key={room.number} className={`staff-pick-room${rooms.includes(room.number) ? " is-picked" : ""}`}><input type="checkbox" checked={rooms.includes(room.number)} onChange={event => setRooms(value => event.target.checked ? [...value, room.number] : value.filter(number => number !== room.number))} /><span>Room {room.number}<small>{room.housekeeping.replaceAll("_", " ")}</small></span></label>)}</div>
        {available.length === 0 && <StaffNotice>No room is available to assign. Return to Rooms and resolve the room status.</StaffNotice>}
        <label>Expected check-out<input type="date" name="expectedCheckOut" required min={hotelToday()} defaultValue={stay?.expected_check_out || reservation.check_out} /></label>
      </fieldset>
      <fieldset disabled={pending}><legend>Booking source</legend><label>Booked through<select value={source} onChange={event => setSource(event.target.value as typeof source)}>{bookingSources.map(value => <option key={value} value={value}>{sourceLabels[value]}</option>)}</select></label>
        {source === "other" && <label>Source name<input name="sourceOther" required maxLength={100} defaultValue={stay?.source_other || ""} /></label>}
        {!["direct_website", "walk_in", "phone"].includes(source) && <label>OTA booking reference<input name="otaReference" maxLength={120} defaultValue={stay?.ota_reference || ""} /></label>}
      </fieldset>
      <fieldset disabled={pending}><legend>Guest details</legend>
        <label>Full name<input name="fullName" autoComplete="name" defaultValue={reservation.full_name} required minLength={2} maxLength={120} /></label>
        <label>Phone number<input name="phone" type="tel" autoComplete="tel" defaultValue={reservation.phone} required maxLength={20} placeholder="+91 98765 43210" /></label>
        <label>Email (optional)<input name="email" type="email" autoComplete="email" defaultValue={reservation.email} maxLength={254} /></label>
        <label>Home address<textarea name="address" autoComplete="street-address" defaultValue={stay?.address || ""} required minLength={5} maxLength={1000} /></label>
        <label>Nationality<input value={nationality} onChange={event => setNationality(event.target.value)} required minLength={2} maxLength={80} /></label>
        <div className="staff-field-pair"><label>Adults<input name="adults" type="number" inputMode="numeric" min={1} max={12} required defaultValue={stay?.adults || reservation.guests} /></label><label>Children<input name="children" type="number" inputMode="numeric" min={0} max={11} required defaultValue={stay?.children || 0} /></label></div>
      </fieldset>
      <fieldset disabled={pending}><legend>Guest ID</legend><label>ID type<select value={idType} onChange={event => setIdType(event.target.value)}>{idTypes.map(value => <option value={value.value} key={value.value}>{value.label}</option>)}</select></label>
        <label>{idType === "aadhaar" ? "Aadhaar number" : "ID number"}<input name="idNumber" autoComplete="off" required minLength={4} maxLength={80} defaultValue={draft?.id_number || ""} inputMode={idType === "aadhaar" ? "numeric" : "text"} /></label>
        {idType === "aadhaar" && <p className="staff-help">Only the last four digits are shown after saving.</p>}
        <div className="staff-private-note"><ShieldCheck size={20} aria-hidden="true" /> ID photos are private. Only managers and front desk staff can open them.</div>
        {(["front", "back"] as const).map(side => <label key={side} className="staff-camera-field"><span><Camera size={20} aria-hidden="true" /> ID {side} photo {uploaded[side] && <Check size={18} aria-label="Uploaded" />}</span><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required={!uploaded[side]} onChange={event => side === "front" ? setFront(event.target.files?.[0] || null) : setBack(event.target.files?.[0] || null)} /><span className="staff-help">Take a photo or choose one from this phone. Up to 5 MB.</span></label>)}
      </fieldset>
      {foreign && <fieldset disabled={pending}><legend>Foreign guest</legend><StaffNotice>File Form III (formerly Form C) through FRRO within 24 hours of arrival. Report departure within 24 hours too. <a href="https://www.indianfrro.gov.in/frro/FormC/login.jsp" target="_blank" rel="noreferrer">Open FRRO</a></StaffNotice><label>Passport number<input name="passportNumber" required maxLength={80} defaultValue={stay?.passport_number || ""} /></label><label>Visa number<input name="visaNumber" required maxLength={80} defaultValue={stay?.visa_number || ""} /></label><label>Visa expiry<input name="visaExpiry" type="date" required defaultValue={stay?.visa_expiry || ""} /></label></fieldset>}
      <div className="staff-sticky-action"><button className="staff-primary" disabled={pending || !data.staffCoreReady || rooms.length !== reservation.rooms}>{pending ? "Saving check-in…" : "Check in"}</button></div>
    </form>
  </div>;
}
