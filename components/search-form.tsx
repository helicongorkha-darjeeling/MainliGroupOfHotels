"use client";
import { FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { StayCalendar } from "./stay-calendar";
import { useHotelToday } from "./use-hotel-today";
import { addHotelDays, hotelToday, staySearchSchema, formatHotelDate } from "@/lib/stay";
type SearchFormProps = { compact?: boolean; initialCheckIn?: string; initialCheckOut?: string; initialGuests?: string };
export function SearchForm({ compact = false, initialCheckIn = "", initialCheckOut = "", initialGuests = "2" }: SearchFormProps) {
  const router = useRouter(), id = useId(), today = useHotelToday();
  const initial = staySearchSchema.safeParse({ checkIn: initialCheckIn, checkOut: initialCheckOut, guests: initialGuests });
  const [chosenCheckIn, setCheckIn] = useState(initial.success ? initial.data.checkIn : ""), [chosenCheckOut, setCheckOut] = useState(initial.success ? initial.data.checkOut : "");
  const [guests, setGuests] = useState(initial.success ? initial.data.guests : 2), [error, setError] = useState(""), [expanded, setExpanded] = useState(!compact);
  const checkIn = chosenCheckIn || today, checkOut = chosenCheckOut > checkIn ? chosenCheckOut : checkIn ? addHotelDays(checkIn, 1) : "";
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkIn || !checkOut) { setError("Choose both check-in and checkout dates."); return; }
    if (checkOut <= checkIn) { setError("Checkout must be after check-in."); return; }
    if (checkIn < hotelToday()) { setError("Check-in cannot be in the past. Choose a new arrival date."); return; }
    setError(""); router.push("/rooms?" + new URLSearchParams({ checkIn, checkOut, guests: String(guests) }));
  }
  return <div className={compact ? "compact-search" : ""}>
    {compact && <button className="search-toggle" type="button" aria-expanded={expanded} aria-controls={id + "-panel"} onClick={() => setExpanded(!expanded)}>{formatHotelDate(checkIn)} → {formatHotelDate(checkOut)} · {guests} guests <span>{expanded ? "Close" : "Change"}</span></button>}
    <div id={id + "-panel"} className="search-form-panel" data-expanded={expanded}><form className="search-form" onSubmit={submit} noValidate>
      <StayCalendar checkIn={checkIn} checkOut={checkOut} onChange={(field, value) => { if (field === "checkIn") { setCheckIn(value); if (!checkOut || checkOut <= value) setCheckOut(addHotelDays(value, 1)); } else setCheckOut(value); setError(""); }} />
      <div className="guest-stepper"><span id={id + "-guests"}>Guests</span><div role="group" aria-labelledby={id + "-guests"}>
        <button type="button" aria-label="Fewer guests" disabled={guests === 1} onClick={() => setGuests(guests - 1)}><Minus size={16} /></button><output aria-live="polite" aria-atomic="true">{guests}</output>
        <button type="button" aria-label="More guests" disabled={guests === 12} onClick={() => setGuests(guests + 1)}><Plus size={16} /></button>
      </div><input type="hidden" name="guests" value={guests} /></div>
      <button type="submit" className="button button-primary search-submit">Check availability</button>{error && <p className="form-error" role="alert">{error}</p>}
    </form></div>
  </div>;
}
