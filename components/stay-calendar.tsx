"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DayPicker } from "@daypicker/react";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { addHotelDays, formatHotelDate, hotelToday, nightsBetween } from "@/lib/stay";

type DateField = "checkIn" | "checkOut";
type StayCalendarProps = {
  checkIn: string;
  checkOut: string;
  onChange: (field: DateField, value: string) => void;
};

// Calendar values are dates, not instants. Local noon avoids UTC/DST day shifts.
function calendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function StayCalendar({ checkIn, checkOut, onChange }: StayCalendarProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const checkInRef = useRef<HTMLButtonElement>(null);
  const checkOutRef = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState<DateField | null>(null);
  const [today, setToday] = useState(hotelToday);
  const nights = nightsBetween(checkIn, checkOut);

  useEffect(() => {
    if (!active) return;
    const dialog = dialogRef.current;
    const anchor = active === "checkIn" ? checkInRef.current : checkOutRef.current;
    if (!dialog || !anchor) return;

    function position() {
      if (!dialog || !anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = dialog.offsetWidth;
      const height = dialog.offsetHeight;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const below = rect.bottom + 10;
      const top = below + height <= window.innerHeight - 12
        ? below
        : Math.max(12, rect.top - height - 10);
      dialog.style.setProperty("--calendar-left", `${left}px`);
      dialog.style.setProperty("--calendar-top", `${top}px`);
    }

    position();
    const observer = new ResizeObserver(position);
    observer.observe(dialog);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [active]);

  function open(field: DateField) {
    setToday(hotelToday());
    setActive(field);
    dialogRef.current?.showModal();
  }

  function select(date: Date | undefined) {
    if (!date || !active) return;
    const value = dateValue(date);
    onChange(active, value);
    if (active === "checkIn") setActive("checkOut");
    else dialogRef.current?.close();
  }

  const nextDay = addHotelDays(checkIn || today, 1);
  const minimum = active === "checkOut" && nextDay > today ? nextDay : today;

  return (
    <>
      {(["checkIn", "checkOut"] as const).map((field) => (
        <div className="search-field search-field-date" key={field}>
          <button
            ref={field === "checkIn" ? checkInRef : checkOutRef}
            type="button"
            className="date-trigger"
            aria-haspopup="dialog"
            aria-label={`${field === "checkIn" ? "Check-in" : "Checkout"}, ${formatHotelDate(field === "checkIn" ? checkIn : checkOut) || "Choose a date"}`}
            aria-expanded={active === field}
            aria-controls={`${id}-calendar`}
            onClick={() => open(field)}
          >
            <span className="date-field-label"><CalendarDays size={16} aria-hidden="true" />{field === "checkIn" ? "Check-in" : "Checkout"}</span>
            <span className="date-field-value">{formatHotelDate(field === "checkIn" ? checkIn : checkOut) || "Choose a date"}<ChevronDown size={17} aria-hidden="true" /></span>
          </button>
          <input type="hidden" name={field} value={field === "checkIn" ? checkIn : checkOut} />
        </div>
      ))}
      <dialog
        ref={dialogRef}
        id={`${id}-calendar`}
        className="stay-calendar-dialog"
        aria-labelledby={`${id}-calendar-title`}
        onClose={() => {
          const trigger = active === "checkOut" ? checkOutRef.current : checkInRef.current;
          setActive(null);
          trigger?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
          }
        }}
      >
        <div className="calendar-heading">
          <div><p className="eyebrow">Your stay</p><h3 id={`${id}-calendar-title`}>{active === "checkOut" ? "Choose checkout" : "Choose check-in"}</h3></div>
          <button type="button" className="quiet-icon" aria-label="Close calendar" onClick={() => dialogRef.current?.close()}><X size={20} /></button>
        </div>
        <div className="calendar-dates">
          <button type="button" aria-pressed={active === "checkIn"} onClick={() => setActive("checkIn")}><span>Check-in</span><strong>{formatHotelDate(checkIn)}</strong></button>
          <button type="button" aria-pressed={active === "checkOut"} onClick={() => setActive("checkOut")}><span>Checkout</span><strong>{formatHotelDate(checkOut)}</strong></button>
        </div>
        {active && (
          <DayPicker
            key={active}
            mode="single"
            required
            autoFocus
            animate
            fixedWeeks
            showOutsideDays
            weekStartsOn={1}
            today={calendarDate(today)}
            defaultMonth={calendarDate(active === "checkIn" ? checkIn : checkOut)}
            startMonth={calendarDate(today)}
            selected={calendarDate(active === "checkIn" ? checkIn : checkOut)}
            disabled={{ before: calendarDate(minimum) }}
            modifiers={{ stay: { after: calendarDate(checkIn), before: calendarDate(checkOut) }, arrival: calendarDate(checkIn), departure: calendarDate(checkOut) }}
            modifiersClassNames={{ stay: "stay-middle", arrival: "stay-endpoint", departure: "stay-endpoint" }}
            onSelect={select}
          />
        )}
        <div className="calendar-footer">
          <p role="status">{nights} {nights === 1 ? "night" : "nights"} · dates in Darjeeling</p>
          <button type="button" onClick={() => dialogRef.current?.close()}>Done</button>
        </div>
      </dialog>
    </>
  );
}
