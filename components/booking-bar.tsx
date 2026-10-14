import { SearchForm } from "./search-form";
export function BookingBar({ id = "check-rooms", variant = "hero" }: { id?: string; variant?: "hero" | "inline" }) {
  return <section id={id} className={`mainali-booking-bar site-shell booking-bar-${variant}`} aria-label="Plan your stay at Hotel Teesta"><SearchForm compact={variant === "inline"} /></section>;
}
