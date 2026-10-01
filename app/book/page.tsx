import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BedDouble, CalendarDays, ShieldCheck, Users } from "lucide-react";
import { GuestBookingFlow } from "@/components/guest-booking-flow";
import { PropertyGallery } from "@/components/property-gallery";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { teesta } from "@/lib/property";
import { formatInr } from "@/lib/rates";
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
      <main>
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

  const nights = nightsBetween(parsed.data.checkIn, parsed.data.checkOut);
  const plan = planRoomChoice(room, parsed.data.guests, nights);
  const bookingPath = `/book?${new URLSearchParams({
    checkIn: parsed.data.checkIn,
    checkOut: parsed.data.checkOut,
    guests: String(parsed.data.guests),
    roomType: room.id,
  }).toString()}`;

  return (
    <main className="booking-page">
      <SiteHeader />
      <section className="booking-shell site-shell">
        <div className="booking-visual">
          <Image src={room.photo} alt={`${room.name} at Hotel Teesta`} fill loading="eager" fetchPriority="high" sizes="(max-width: 900px) 100vw, 48vw" className="cover-image" style={{ objectPosition: room.position }} />
          <span>{room.name} · Hotel Teesta</span>
        </div>

        <div className="booking-panel">
          <Link href={`/rooms?${bookingPath.split("?")[1]}`} className="back-link"><ArrowLeft size={17} /> Change room</Link>
          <p className="eyebrow">Your booking · Hotel Teesta</p>
          <h1>Review your stay.</h1>

          <div className="booking-stay-summary">
            <div><CalendarDays size={18} /><span><strong>{formatHotelDate(parsed.data.checkIn)} — {formatHotelDate(parsed.data.checkOut)}</strong>{nights} {nights === 1 ? "night" : "nights"}</span></div>
            <div><Users size={18} /><span><strong>{parsed.data.guests} {parsed.data.guests === 1 ? "guest" : "guests"}</strong>{plan.rooms} {plan.rooms === 1 ? "room" : "rooms"}</span></div>
            <div><BedDouble size={18} /><span><strong>{room.name}</strong>{plan.description}</span></div>
          </div>

          <div className="booking-total"><span>{plan.quote ? "Starting stay total" : "Stay rate"}</span><strong>{plan.quote ? `${formatInr(plan.quote.stayTotalPaise)}+` : "On request"}</strong></div>
          <p className="booking-assurance"><ShieldCheck size={17} /> Nothing is charged while we verify your identity and room availability.</p>

          <GuestBookingFlow
            bookingPath={bookingPath}
            checkIn={parsed.data.checkIn}
            checkOut={parsed.data.checkOut}
            guests={parsed.data.guests}
            rooms={plan.rooms}
            categoryId={room.categoryId}
            bookingEnabled={process.env.BOOKING_MODE === "live"}
          />
        </div>
      </section>
      <section className="booking-photo-section site-shell section-space" aria-labelledby="booking-photos-title">
        <div className="section-heading-row"><div><p className="eyebrow">Before your stay</p><h2 id="booking-photos-title">Rooms &amp; hotel spaces</h2></div><p>Explore the rooms, bathroom, lobby, restaurant and front desk.</p></div>
        <PropertyGallery photos={teesta.gallery} />
      </section>
      <SiteFooter />
    </main>
  );
}
