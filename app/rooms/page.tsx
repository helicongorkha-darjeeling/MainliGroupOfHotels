import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BedDouble, CalendarDays, Users } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getTeestaRoomType } from "@/lib/room-types";
import { searchInventory } from "@/lib/server/reservations";
import { isAvailable } from "@/lib/reservations";
import { formatInr } from "@/lib/rates";
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
  const inventory = parsed.success ? await searchInventory(parsed.data.checkIn,parsed.data.checkOut,parsed.data.guests) : null;
  const recommended = inventory?.choices.find(isAvailable)?.code;
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
          <SearchForm key={`${raw.checkIn}/${raw.checkOut}/${raw.guests}`} compact initialCheckIn={raw.checkIn} initialCheckOut={raw.checkOut} initialGuests={raw.guests} />
        </div>
      </section>

      <section className="results-section section-space">
        <div className="site-shell">
          <div className="results-heading"><h2>{parsed.success ? "Choose your room" : "Choose dates to see your stay"}</h2>{parsed.success && <span>{parsed.data.guests} {parsed.data.guests === 1 ? "guest" : "guests"} · {nights} {nights === 1 ? "night" : "nights"}</span>}</div>
          {parsed.success && !inventory ? <p className="preview-alert">Availability could not be loaded. Please retry your search; no room has been held.</p> : parsed.success && inventory ? (
            <div className="room-results">
              {inventory.choices.map((choice) => {
                const room = getTeestaRoomType(choice.code);
                if(!room)return null;
                const available = isAvailable(choice);
                return <article className="room-result" key={room.id}>
                <div className="room-result-image">
                  <Image src={room.photo} alt={room.id==="six-person-room"?"Hotel Teesta exterior; six-person room photograph pending":`${room.name} at Hotel Teesta`} fill sizes="(max-width: 800px) 100vw, 35vw" className="cover-image" style={{ objectPosition: room.position }} />
                </div>
                <div className="room-result-body">
                  <span className="room-kicker">{recommended===room.id?"Recommended for your party":"Hotel Teesta"}</span>
                  <h3>{room.name}</h3>
                  <p><BedDouble size={17} /> Up to {room.maxGuests} guests per room · {choice.rooms} {choice.rooms === 1 ? "room" : "rooms"} for your party</p>
                  <p className="room-caveat">{room.description} {choice.availableRooms} {choice.availableRooms===1?"room available":"rooms available"} for every night of your stay.</p>
                </div>
                <div className="room-result-action">
                  <span>Stay total · {nights} {nights === 1 ? "night" : "nights"}</span>
                  <strong>{formatInr(choice.quote.totalPaise)}{!choice.quote.taxConfirmed&&"+"}</strong>
                  {choice.quote.standardSubtotalPaise&&choice.quote.standardSubtotalPaise>choice.quote.subtotalPaise?<small className="seasonal-price-reference">Standard room total {formatInr(choice.quote.standardSubtotalPaise)} · seasonal rate applied</small>:null}
                  {available?<Link className="button button-primary" href={`/book?${bookingQuery}&roomType=${room.id}`} aria-label={`Choose ${room.name}`}>Choose room</Link>:<span className="room-unavailable">{choice.bookable?"Sold out for these dates":"Not open online"}</span>}
                  <small className="booking-test-note">{choice.quote.taxConfirmed?"Includes configured taxes":"Taxes awaiting hotel confirmation"} · tentative hold available</small>
                </div>
              </article>;
              })}
            </div>
          ) : <p className="empty-result">Add your check-in, checkout and guest count above to see the right number of rooms and your starting price.</p>}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
