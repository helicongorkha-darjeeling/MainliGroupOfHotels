import Link from "next/link";
import { Brand } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-shell footer-grid">
        <div>
          <Brand inverted />
          <p>Thoughtful stays from the Darjeeling hills.</p>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/stays/teesta">Hotel Teesta</Link>
          <Link href="/rooms">Find rooms</Link>
          <Link href="/my-bookings">My bookings</Link>
        </div>
        <div>
          <h2>Information</h2>
          <Link href="/policies/booking-terms">Booking terms</Link>
          <Link href="/policies/refunds">Refunds</Link>
          <Link href="/policies/privacy">Privacy</Link>
        </div>
      </div>
      <div className="site-shell footer-note">
        <span>Direct online bookings opening soon.</span>
        <span>© 2026 Mainali Group of Hotels</span>
      </div>
    </footer>
  );
}
