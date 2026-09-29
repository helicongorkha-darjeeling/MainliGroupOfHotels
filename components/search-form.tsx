"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Users } from "lucide-react";

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
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [error, setError] = useState("");
  const today = useMemo(
    () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()),
    [],
  );

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
      <div className="search-field">
        <label htmlFor={compact ? "compact-check-in" : "check-in"}>
          <CalendarDays size={16} aria-hidden="true" /> Check-in
        </label>
        <input
          id={compact ? "compact-check-in" : "check-in"}
          name="checkIn"
          type="date"
          min={today}
          value={checkIn}
          onChange={(event) => setCheckIn(event.target.value)}
          required
        />
      </div>
      <div className="search-field">
        <label htmlFor={compact ? "compact-check-out" : "check-out"}>
          <CalendarDays size={16} aria-hidden="true" /> Checkout
        </label>
        <input
          id={compact ? "compact-check-out" : "check-out"}
          name="checkOut"
          type="date"
          min={checkIn || today}
          value={checkOut}
          onChange={(event) => setCheckOut(event.target.value)}
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
