import Link from "next/link";
import { Brand } from "./brand";
import { hotelAddress } from "@/lib/hotel-content";
import { siteCopy } from "@/lib/site-copy";
export function SiteFooter() {
  return <footer className="site-footer"><div className="site-shell"><div className="footer-brand"><Brand variant="dark" /><p>{siteCopy.tagline}</p></div><div className="footer-grid">
    <div><h2>Stay</h2><Link href="/stays/teesta">Hotel Teesta</Link><Link href="/rooms">Find rooms</Link><Link href="/our-story">Our story</Link></div>
    <div><h2>Help</h2><Link href="/my-bookings">My booking</Link><Link href="/members">Members login</Link><Link href="/policies/booking-terms">Booking terms</Link><Link href="/policies/refunds">Cancellation &amp; refunds</Link><Link href="/policies/privacy">Privacy</Link></div>
    <div><h2>Find us</h2><p>{hotelAddress}</p><Link href="/contact">Location &amp; enquiries</Link></div>
    </div><div className="footer-note"><span>Book direct · Hotel Teesta</span><span>© {new Date().getFullYear()} Mainali Hospitality</span></div></div></footer>;
}
