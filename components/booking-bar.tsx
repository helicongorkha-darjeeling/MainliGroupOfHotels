import { SearchForm } from "@/components/search-form";

// Presentation only: retain the calendar, date validation and booking query.
export function BookingBar({ id = "check-rooms" }: { id?: string }) {
  return <section id={id} className="mainali-booking-bar site-shell" aria-label="Plan your stay at Hotel Teesta">
    <div className="booking-destination"><span>Destination</span><strong>Hotel Teesta</strong><small>Darjeeling</small></div>
    <SearchForm />
    <p className="booking-bar-note">Check live room availability. Reserve tentatively for 24 hours; payment opens after the hotel confirms taxes and provider setup.</p>
  </section>;
}
