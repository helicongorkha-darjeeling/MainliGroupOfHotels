import type { Metadata } from "next";
import Link from "next/link";
import { EditorialPage } from "@/components/editorial-page";

export const metadata: Metadata = { title: "Our story" };
export default function OurStoryPage() {
  return <EditorialPage title="A welcome from the hills." eyebrow="Mainali Group of Hotels" intro="Our website begins with Hotel Teesta, Darjeeling." image="/images/teesta-reception-desk.webp"><section className="mainali-introduction section-space site-shell"><p className="eyebrow">Human hospitality, clear choices</p><h2>A stay you can see<br />before you arrive.</h2><span className="gold-divider" /><p>We’re bringing Hotel Teesta’s real rooms and spaces online so you can plan your visit with confidence. A direct connection to the hotel, a clear room choice, and your stay details in one place.</p><p>In Chauk Bazaar, opposite the bus stand, Teesta is a budget-friendly base for a Darjeeling journey.</p><Link href="/stays/teesta" className="button button-primary story-cta">Meet Hotel Teesta</Link></section></EditorialPage>;
}
