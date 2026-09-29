"use client";

import { FormEvent, MouseEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Users } from "lucide-react";
import { addHotelDays, hotelToday } from "@/lib/stay";

type SearchFormProps = {
  compact?: boolean;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: string;
};

export function SearchForm({
  compact = false,
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = "2",
}: SearchFormProps) {
  const router = useRouter();
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const today = useMemo(() => hotelToday(), []);
  const defaultCheckIn = initialCheckIn || today;
  const defaultCheckOut = initialCheckOut > defaultCheckIn ? initialCheckOut : addHotelDays(defaultCheckIn, 1);
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [error, setError] = useState("");

  function openPicker(event: MouseEvent<HTMLDivElement>, input: HTMLInputElement | null) {
    if (!input || event.target === input) return;
    input.focus();
    input.showPicker?.();
  }

  function updateCheckIn(value: string) {
    setCheckIn(value);
    if (!checkOut || checkOut <= value) setCheckOut(addHotelDays(value, 1));
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkIn || !checkOut) {
      setError("Choose both check-in and checkout dates.");
      return;
    }
    if (checkOut <= checkIn) {
      setError("Checkout must be after check-in.");
      return;
    }
    setError("");
    const query = new URLSearchParams({ checkIn, checkOut, guests });
    router.push(`/rooms?${query.toString()}`);
  }

  return (
    <form className={`search-form ${compact ? "search-form-compact" : ""}`} onSubmit={submit} noValidate>
      <div className="search-field search-field-date" onClick={(event) => openPicker(event, checkInRef.current)}>
        <label htmlFor={compact ? "compact-check-in" : "check-in"}>
          <CalendarDays size={16} aria-hidden="true" /> Check-in
        </label>
        <input
          ref={checkInRef}
          id={compact ? "compact-check-in" : "check-in"}
          name="checkIn"
          type="date"
          min={today}
          value={checkIn}
          onClick={(event) => event.currentTarget.showPicker?.()}
          onChange={(event) => updateCheckIn(event.target.value)}
          required
        />
      </div>
      <div className="search-field search-field-date" onClick={(event) => openPicker(event, checkOutRef.current)}>
        <label htmlFor={compact ? "compact-check-out" : "check-out"}>
          <CalendarDays size={16} aria-hidden="true" /> Checkout
        </label>
        <input
          ref={checkOutRef}
          id={compact ? "compact-check-out" : "check-out"}
          name="checkOut"
          type="date"
          min={addHotelDays(checkIn || today, 1)}
          value={checkOut}
          onClick={(event) => event.currentTarget.showPicker?.()}
          onChange={(event) => { setCheckOut(event.target.value); setError(""); }}
          required
        />
      </div>
      <div className="search-field">
        <label htmlFor={compact ? "compact-guests" : "guests"}>
          <Users size={16} aria-hidden="true" /> Guests
        </label>
        <select
          id={compact ? "compact-guests" : "guests"}
          name="guests"
          value={guests}
          onChange={(event) => setGuests(event.target.value)}
        >
          {Array.from({ length: 8 }, (_, index) => index + 1).map((count) => (
            <option value={count} key={count}>
              {count} {count === 1 ? "guest" : "guests"}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="button button-primary search-submit">
        Find rooms <ArrowRight size={17} aria-hidden="true" />
      </button>
      <p className="form-error" role="alert" aria-live="polite">
        {error}
      </p>
    </form>
  );
}
