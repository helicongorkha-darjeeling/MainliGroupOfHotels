import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BedDouble, CalendarDays, Users } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { teesta } from "@/lib/property";
import { describeRoomSplit, formatInr, quoteTeestaStay } from "@/lib/rates";
import { formatHotelDate, nightsBetween, staySearchSchema } from "@/lib/stay";

export const metadata: Metadata = { title: "Find rooms" };

type RoomsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  const params = await searchParams;
  const raw = {
    checkIn: typeof params.checkIn === "string" ? params.checkIn : "",
    checkOut: typeof params.checkOut === "string" ? params.checkOut : "",
    guests: typeof params.guests === "string" ? params.guests : "2",
  };
  const parsed = staySearchSchema.safeParse(raw);
  const nights = parsed.success ? nightsBetween(parsed.data.checkIn, parsed.data.checkOut) : 0;
  const quote = parsed.success ? quoteTeestaStay(parsed.data.guests, nights) : null;
  const bookingHref = parsed.success
    ? `/book?${new URLSearchParams({
        checkIn: parsed.data.checkIn,
        checkOut: parsed.data.checkOut,
        guests: String(parsed.data.guests),
      }).toString()}`
    : "/stays/teesta#check-rooms";

  return (
    <main>
      <SiteHeader />
      <section className="rooms-head site-shell">
        <Link href="/stays/teesta" className="back-link"><ArrowLeft size={17} /> Hotel Teesta</Link>
        <p className="eyebrow">Room search</p>
        <h1>{parsed.success ? `${nights} ${nights === 1 ? "night" : "nights"} in Darjeeling` : "Choose your stay"}</h1>
        {parsed.success && (
          <div className="search-summary" aria-label="Selected stay">
            <span><CalendarDays size={17} /> {formatHotelDate(parsed.data.checkIn)} — {formatHotelDate(parsed.data.checkOut)}</span>
            <span><Users size={17} /> {parsed.data.guests} {parsed.data.guests === 1 ? "guest" : "guests"}</span>
          </div>
        )}
      </section>

      <section className="modify-search">
        <div className="site-shell">
          <SearchForm compact initialCheckIn={raw.checkIn} initialCheckOut={raw.checkOut} initialGuests={raw.guests} />
        </div>
      </section>

      <section className="results-section section-space">
        <div className="site-shell">
          <div className="results-heading"><h2>{quote ? "Your room plan" : "Choose dates to see your stay"}</h2>{quote && <span>{quote.rooms} {quote.rooms === 1 ? "room" : "rooms"} for {quote.guests} {quote.guests === 1 ? "guest" : "guests"}</span>}</div>
          {quote ? (
            <div className="room-results">
              <article className="room-result" key={teesta.publicRoom.id}>
                <div className="room-result-image">
                  <Image src={teesta.publicRoom.photo} alt="Double room at Hotel Teesta" fill sizes="(max-width: 800px) 100vw, 35vw" className="cover-image" />
                </div>
                <div className="room-result-body">
                  <span className="room-kicker">Hotel Teesta</span>
                  <h3>{teesta.publicRoom.name}</h3>
                  <p><BedDouble size={17} /> {describeRoomSplit(quote)}</p>
                  <p className="room-caveat">Starting rate for {quote.nights} {quote.nights === 1 ? "night" : "nights"}. Final availability and any applicable taxes are confirmed before payment.</p>
                </div>
                <div className="room-result-action">
                  <span>Stay starts at</span>
                  <strong>{formatInr(quote.stayTotalPaise)}+</strong>
                  <Link className="button button-primary" href={bookingHref}>Continue to booking</Link>
                  <small className="booking-test-note">Secure sign-in first · no charge yet</small>
                </div>
              </article>
            </div>
          ) : <p className="empty-result">Add your check-in, checkout and guest count above to see the right number of rooms and your starting price.</p>}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
