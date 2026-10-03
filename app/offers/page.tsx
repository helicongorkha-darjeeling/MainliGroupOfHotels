import type { Metadata } from "next";
import Link from "next/link";
import { EditorialPage } from "@/components/editorial-page";

export const metadata: Metadata = { title: "Direct booking rates" };
export default function OffersPage() {
  return <EditorialPage title="Your stay. Booked directly." eyebrow="Direct with Mainali" intro="A clear starting rate and a shorter path to your hotel." image="/images/teesta-double-room-window.webp"><section className="section-space site-shell direct-offer"><p className="eyebrow">Hotel Teesta · Double Room</p><h2>From ₹2,500+<span>per room · per night</span></h2><p>Choose your dates for an indicative stay total. Review your contact details before verification or payment.</p><Link href="/stays/teesta#check-rooms" className="button button-primary">See your direct rate</Link><p className="fine-print">Starting rates are subject to availability and applicable taxes. Your final stay price will be confirmed before payment.</p></section></EditorialPage>;
}
