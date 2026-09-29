import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BedDouble, CalendarDays, ShieldCheck, Users } from "lucide-react";
import { GuestBookingFlow } from "@/components/guest-booking-flow";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { teesta } from "@/lib/property";
import { describeRoomSplit, formatInr, quoteTeestaStay } from "@/lib/rates";
import { formatHotelDate, nightsBetween, staySearchSchema } from "@/lib/stay";

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

  if (!parsed.success) {
    return (
      <main>
        <SiteHeader />
        <section className="booking-invalid site-shell">
          <p className="eyebrow">Booking details</p>
          <h1>Choose valid stay dates first.</h1>
          <Link className="button button-primary" href="/stays/teesta#check-rooms">Choose dates</Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const nights = nightsBetween(parsed.data.checkIn, parsed.data.checkOut);
  const quote = quoteTeestaStay(parsed.data.guests, nights);
  const bookingPath = `/book?${new URLSearchParams({
    checkIn: parsed.data.checkIn,
    checkOut: parsed.data.checkOut,
    guests: String(parsed.data.guests),
  }).toString()}`;

  return (
    <main className="booking-page">
      <SiteHeader />
      <section className="booking-shell site-shell">
        <div className="booking-visual">
          <Image src={teesta.publicRoom.photo} alt="Double room at Hotel Teesta" fill priority sizes="(max-width: 900px) 100vw, 48vw" className="cover-image" />
          <span>Hotel Teesta · Darjeeling</span>
        </div>

        <div className="booking-panel">
          <Link href={`/rooms?${bookingPath.split("?")[1]}`} className="back-link"><ArrowLeft size={17} /> Change room</Link>
          <p className="eyebrow">Secure booking · Step 1 of 3</p>
          <h1>Review your stay.</h1>

          <div className="booking-stay-summary">
            <div><CalendarDays size={18} /><span><strong>{formatHotelDate(parsed.data.checkIn)} — {formatHotelDate(parsed.data.checkOut)}</strong>{nights} {nights === 1 ? "night" : "nights"}</span></div>
            <div><Users size={18} /><span><strong>{parsed.data.guests} {parsed.data.guests === 1 ? "guest" : "guests"}</strong>{quote.rooms} {quote.rooms === 1 ? "room" : "rooms"}</span></div>
            <div><BedDouble size={18} /><span><strong>{teesta.publicRoom.name}</strong>{describeRoomSplit(quote)}</span></div>
          </div>

          <div className="booking-total"><span>Starting stay total</span><strong>{formatInr(quote.stayTotalPaise)}+</strong></div>
          <p className="booking-assurance"><ShieldCheck size={17} /> Nothing is charged while we verify your identity and room availability.</p>

          <GuestBookingFlow
            bookingPath={bookingPath}
            checkIn={parsed.data.checkIn}
            checkOut={parsed.data.checkOut}
            guests={parsed.data.guests}
            rooms={quote.rooms}
            bookingEnabled={process.env.BOOKING_MODE === "live"}
          />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
