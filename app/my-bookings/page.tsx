import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { GoogleAuth } from "@/components/google-auth";
import { guestReservations } from "@/lib/server/reservations";
import { categoryLabels } from "@/lib/reservations";
import { formatInr } from "@/lib/rates";
import { formatHotelDate } from "@/lib/stay";
import { ReservationPayment } from "@/components/reservation-payment";
import { CancelReservation } from "@/components/cancel-reservation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "My bookings" };

export default async function MyBookingsPage({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const query = await searchParams;
  const {user,bookings,unavailable,evaluatedAt}=await guestReservations();
  return (
    <main>
      <SiteHeader />
      <section className="account-page site-shell">
        <div className="account-copy">
          <p className="eyebrow">Guest access</p>
          <h1>{user ? "You're signed in." : <>Your stays,<br />one account.</>}</h1>
          <p>{user ? `Signed in as ${user.email ?? user.phone ?? "a verified guest"}.` : "Sign in securely with Google to access your Mainali guest account."}</p>
          <div className="account-points">
            <span><KeyRound /> No extra password to remember</span>
            <span><ShieldCheck /> A private account for your stays</span>
          </div>
          {user&&unavailable&&<p className="preview-alert">Booking history could not be loaded. Please retry shortly.</p>}
          {user&&!unavailable&&bookings.length===0&&<p>You have no online reservations yet. <Link href="/stays/teesta#check-rooms">Choose your stay</Link>.</p>}
          {bookings.map(booking=>{
            const expired=["tentative","payment_pending"].includes(booking.status)&&!!booking.hold_until&&Date.parse(booking.hold_until)<=evaluatedAt;
            return <article className="guest-reservation-card" key={booking.id}><p className="eyebrow">{expired?"Expired":booking.status.replaceAll("_"," ")}</p><h2>{booking.reference}</h2>
              <p>{categoryLabels[booking.category]} · {booking.rooms} {booking.rooms===1?"room":"rooms"} · {booking.guests} {booking.guests===1?"guest":"guests"}</p>
              <p>{formatHotelDate(booking.check_in)} — {formatHotelDate(booking.check_out)}</p>
              <p>Stay total: <strong>{formatInr(booking.total_paise)}{booking.tax_paise===null&&"+"}</strong> · Paid: {formatInr(booking.paid_paise)}</p>
              {booking.tax_paise===null&&<p className="fine-print">Taxes awaiting hotel confirmation.</p>}
              {!expired&&booking.hold_until&&<p>Held until {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(booking.hold_until))} IST.</p>}
              {booking.status==="payment_review"&&<p className="preview-alert">Payment needs hotel review. This reservation is not confirmed; do not pay again.</p>}
              {!expired&&["tentative","payment_pending"].includes(booking.status)&&booking.tax_paise!==null&&<ReservationPayment reservationId={booking.id} />}
              {!expired&&["tentative","payment_pending"].includes(booking.status)&&booking.paid_paise===0&&<CancelReservation reservationId={booking.id}/>}
            </article>;
          })}
          <GoogleAuth signedIn={!!user} authError={query.auth === "failed"} />
          {user && <Link href="/members" className="text-link">My member account</Link>}
          <Link href="/" className="text-link">Return home</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
