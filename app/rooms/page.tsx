import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BedDouble } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { teestaRoomTypes, planRoomChoice } from "@/lib/room-types";
import { formatInr } from "@/lib/rates";
import { hotelToday, nightsBetween, staySearchSchema } from "@/lib/stay";

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
  const searched = staySearchSchema.safeParse(raw);
  // A bookmarked or shared search can go stale; /book rejects past arrivals, so don't offer them here.
  const pastArrival = searched.success && searched.data.checkIn < hotelToday();
  const parsed = pastArrival ? staySearchSchema.safeParse({}) : searched;
  const nights = parsed.success ? nightsBetween(parsed.data.checkIn, parsed.data.checkOut) : 0;
  const bookingQuery = parsed.success
    ? new URLSearchParams({
        checkIn: parsed.data.checkIn,
        checkOut: parsed.data.checkOut,
        guests: String(parsed.data.guests),
      }).toString()
    : "";

  return (
    <main>
      <SiteHeader />
      <section className="rooms-search site-shell" aria-label="Your stay">
        <Link href="/stays/teesta" className="back-link"><ArrowLeft size={17} /> Hotel Teesta</Link>
        <div className="rooms-search-card">
          <p className="eyebrow">Room search · Hotel Teesta</p>
          <SearchForm key={`${raw.checkIn}/${raw.checkOut}/${raw.guests}`} compact initialCheckIn={pastArrival ? "" : raw.checkIn} initialCheckOut={pastArrival ? "" : raw.checkOut} initialGuests={raw.guests} />
        </div>
      </section>

      <section className="rooms-head site-shell">
        <h1>{parsed.success ? `${nights} ${nights === 1 ? "night" : "nights"} in Darjeeling` : "Choose your stay"}</h1>
      </section>

      <section className="results-section section-space">
        <div className="site-shell">
          <div className="results-heading"><h2>{parsed.success ? "Choose your room" : "Choose dates to see your stay"}</h2>{parsed.success && <span>{parsed.data.guests} {parsed.data.guests === 1 ? "guest" : "guests"} · {nights} {nights === 1 ? "night" : "nights"}</span>}</div>
          {parsed.success ? (
            <div className="room-results">
              {teestaRoomTypes.map((room) => {
                const plan = planRoomChoice(room, parsed.data.guests, nights);
                return <article className="room-result" key={room.id}>
                <div className="room-result-image">
                  <Image src={room.photo} alt={`${room.name} at Hotel Teesta`} fill sizes="(max-width: 800px) 100vw, 35vw" className="cover-image" style={{ objectPosition: room.position }} />
                </div>
                <div className="room-result-body">
                  <span className="room-kicker">Hotel Teesta</span>
                  <h3>{room.name}</h3>
                  <p><BedDouble size={17} /> Up to {room.maxGuests} guests per room · {plan.rooms} {plan.rooms === 1 ? "room" : "rooms"} for your party</p>
                  <p className="room-caveat">{room.description} {plan.quote ? "Final availability and taxes are confirmed before payment." : "Contact details first; the hotel confirms the rate and availability before payment."}</p>
                </div>
                <div className="room-result-action">
                  <span>{plan.quote ? `Starting total · ${nights} ${nights === 1 ? "night" : "nights"}` : "Stay rate"}</span>
                  <strong className={plan.quote ? "" : "rate-on-request"}>{plan.quote ? `${formatInr(plan.quote.stayTotalPaise)}+` : "On request"}</strong>
                  <Link className="button button-primary" href={`/book?${bookingQuery}&roomType=${room.id}`} aria-label={`Choose ${room.name}`}>Choose room</Link>
                  <small className="booking-test-note">{plan.description} · no charge yet</small>
                </div>
              </article>;
              })}
            </div>
          ) : pastArrival ? <p className="empty-result">Those dates have passed. Choose a new check-in date above to see rooms and your starting price.</p> : <p className="empty-result">Add your check-in, checkout and guest count above to see the right number of rooms and your starting price.</p>}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
