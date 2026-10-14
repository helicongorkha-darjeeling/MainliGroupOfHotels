import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BedDouble, CalendarDays, ShieldCheck, Users } from "lucide-react";
import { ReservationCheckout } from "@/components/reservation-checkout";
import { SeasonalSavings } from "@/components/seasonal-savings";
import { roomAvailability } from "@/lib/booking-presentation";
import { searchInventory } from "@/lib/server/reservations";
import { createSessionSupabaseClient } from "@/lib/server/supabase-session";
import { isAvailable } from "@/lib/reservations";
import { normaliseGuestPhone } from "@/lib/guest-details";
import { PropertyGallery } from "@/components/property-gallery";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { teesta } from "@/lib/property";
import { formatInr } from "@/lib/rates";
import { publicTeesta } from "@/lib/hotel-content";
import { brandedPhoto } from "@/lib/photo-assets";
import { getTeestaRoomType, planRoomChoice } from "@/lib/room-types";
import { formatHotelDate, hotelToday, nightsBetween, staySearchSchema } from "@/lib/stay";

export const metadata: Metadata = { title: "Book Hotel Teesta" };

type BookPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  const params = await searchParams;
  const parsed = staySearchSchema.safeParse({
    checkIn: typeof params.checkIn === "string" ? params.checkIn : "",
    checkOut: typeof params.checkOut === "string" ? params.checkOut : "",
    guests: typeof params.guests === "string" ? params.guests : "2",
  });

  const room = getTeestaRoomType(params.roomType === undefined ? undefined : typeof params.roomType === "string" ? params.roomType : "invalid");
  if (!parsed.success || !room || parsed.data.checkIn < hotelToday()) {
    return (
      <main className="mainali-public-page">
        <SiteHeader />
        <section className="booking-invalid site-shell">
          <p className="eyebrow">Booking details</p>
          <h1>Choose a room and valid stay dates first.</h1>
          <Link className="button button-primary" href="/stays/teesta#check-rooms">Choose dates</Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const roomPhoto = publicTeesta.rooms.find(item => item.id === room.id)?.photo;
  const nights = nightsBetween(parsed.data.checkIn, parsed.data.checkOut);
  const plan = planRoomChoice(room, parsed.data.guests, nights);
  const [inventory,session] = await Promise.all([searchInventory(parsed.data.checkIn,parsed.data.checkOut,parsed.data.guests),createSessionSupabaseClient()]);
  const user=session?(await session.auth.getUser()).data.user:null;
  const choice=inventory?.choices.find(c=>c.code===room.id);
  const bookingPath = `/book?${new URLSearchParams({
    checkIn: parsed.data.checkIn,
    checkOut: parsed.data.checkOut,
    guests: String(parsed.data.guests),
    roomType: room.id,
  }).toString()}`;

  return (
    <main className="mainali-public-page booking-page">
      <SiteHeader />
      <section className="booking-shell site-shell">
        <div className="booking-visual">
          {roomPhoto ? <Image src={brandedPhoto(roomPhoto,"card")} alt={room.id==="six-person-room"?"Hotel Teesta exterior":`${room.name} at Hotel Teesta`} fill loading="eager" fetchPriority="high" sizes="(max-width: 900px) 100vw, 48vw" className="cover-image" style={{ objectPosition: "100% 100%" }} /> : <div className="room-placeholder">{room.name} · bed layout and photo on request</div>}
          <span>{room.name} · Hotel Teesta</span>
        </div>

        <div className="booking-panel">
          <Link href={`/rooms?${bookingPath.split("?")[1]}`} className="back-link"><ArrowLeft size={17} /> Change room</Link>
          <p className="eyebrow">Your booking · Hotel Teesta</p>
          <h1>Review &amp; pay.</h1>

          {choice&&isAvailable(choice)?<ReservationCheckout
            key={bookingPath}
            bookingPath={bookingPath}
            checkIn={parsed.data.checkIn}
            checkOut={parsed.data.checkOut}
            guests={parsed.data.guests}
            category={choice.code}
            signedIn={!!user}
            initialEmail={user?.email??""}
            initialName={typeof user?.user_metadata.full_name==="string"?user.user_metadata.full_name:""}
            initialPhone={user?.phone?`+${user.phone.replace(/^\+/,"")}`:typeof user?.user_metadata.booking_contact_phone==="string"?normaliseGuestPhone(user.user_metadata.booking_contact_phone)??"":""}
            paymentsEnabled={!!inventory?.paymentsEnabled&&choice.quote.taxConfirmed}
            reviewedTotalPaise={choice.quote.totalPaise}
            authError={params.auth==="failed"}
          >
            <div className="booking-stay-summary">
              <div><BedDouble size={18}/><span><strong>{room.name}</strong>{plan.description}</span></div>
              <div><CalendarDays size={18}/><span><strong>{formatHotelDate(parsed.data.checkIn)} — {formatHotelDate(parsed.data.checkOut)}</strong>{nights} {nights===1?"night":"nights"}</span></div>
              <div><Users size={18}/><span><strong>{parsed.data.guests} {parsed.data.guests===1?"guest":"guests"}</strong>{choice.rooms} {choice.rooms===1?"room":"rooms"}</span></div>
            </div>
            <p className={`room-availability${choice.availableRooms<=3?" room-availability-low":""}`}>{roomAvailability(choice.availableRooms)} · {room.name}</p>
            <p className="fine-print">Availability is checked again when you proceed to payment.</p>
            <SeasonalSavings quote={choice.quote}/>
            <details className="booking-price-details"><summary>Price breakdown · {nights} {nights===1?"night":"nights"}</summary><dl>
              {choice.quote.nightlyPrices.map(night=><div key={night.date}><dt>{formatHotelDate(night.date)}<small>{night.rateName}</small></dt><dd>{formatInr(night.amountPaise)}</dd></div>)}
              <div><dt>Room subtotal</dt><dd>{formatInr(choice.quote.subtotalPaise)}</dd></div>
              <div><dt>Taxes</dt><dd>{choice.quote.taxConfirmed?formatInr(choice.quote.taxPaise??0):"Awaiting confirmation"}</dd></div>
            </dl></details>
            <div className="booking-total"><span>{choice.quote.taxConfirmed?"Stay total":"Room total"}</span><strong>{formatInr(choice.quote.totalPaise)}{!choice.quote.taxConfirmed&&"+"}</strong></div>
            {!choice.quote.taxConfirmed&&<p className="fine-print">Taxes are awaiting hotel confirmation. The final payable total will be shown before payment opens.</p>}
            <p className="booking-assurance"><ShieldCheck size={17}/> Payment confirms your room after a fresh availability check.</p>
          </ReservationCheckout>:<p className="preview-alert">{inventory?"These rooms are no longer available. Please choose another category or date.":"Availability could not be checked. Please retry before booking."}</p>}
        </div>
      </section>
      {user&&<section className="booking-photo-section site-shell section-space" aria-labelledby="booking-photos-title">
        <div className="section-heading-row"><div><p className="eyebrow">Before your stay</p><h2 id="booking-photos-title">Rooms &amp; hotel spaces</h2></div><p>Explore the rooms, bathroom, lobby, restaurant and front desk.</p></div>
        <PropertyGallery photos={teesta.gallery} />
      </section>}
      <SiteFooter />
    </main>
  );
}
