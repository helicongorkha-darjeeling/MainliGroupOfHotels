"use client";

import { FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Users } from "lucide-react";
import { StayCalendar } from "@/components/stay-calendar";
import { useHotelToday } from "@/components/use-hotel-today";
import { addHotelDays, hotelToday, staySearchSchema } from "@/lib/stay";

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
  const id = useId();
  const today = useHotelToday();
  const initialStay = staySearchSchema.safeParse({ checkIn: initialCheckIn, checkOut: initialCheckOut, guests: initialGuests });
  const [chosenCheckIn, setCheckIn] = useState(initialStay.success ? initialStay.data.checkIn : "");
  const [chosenCheckOut, setCheckOut] = useState(initialStay.success ? initialStay.data.checkOut : "");
  const checkIn = chosenCheckIn || today;
  const checkOut = chosenCheckOut > checkIn ? chosenCheckOut : checkIn ? addHotelDays(checkIn, 1) : "";
  const [guests, setGuests] = useState(initialStay.success ? String(initialStay.data.guests) : "2");
  const [error, setError] = useState("");

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
    if (checkIn < hotelToday()) {
      setError("Check-in cannot be in the past. Choose a new arrival date.");
      return;
    }
    setError("");
    const query = new URLSearchParams({ checkIn, checkOut, guests });
    router.push(`/rooms?${query.toString()}`);
  }

  return (
    <form className={`search-form ${compact ? "search-form-compact" : ""}`} onSubmit={submit} noValidate>
      <StayCalendar checkIn={checkIn} checkOut={checkOut} onChange={(field, value) => {
        if (field === "checkIn") updateCheckIn(value);
        else { setCheckOut(value); setError(""); }
      }} />
      <div className="search-field">
        <label htmlFor={`${id}-guests`}>
          <Users size={16} aria-hidden="true" /> Guests
        </label>
        <select
          id={`${id}-guests`}
          name="guests"
          value={guests}
          onChange={(event) => setGuests(event.target.value)}
        >
          {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
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
