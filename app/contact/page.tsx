import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main>
      <SiteHeader />
      <section className="simple-page site-shell">
        <p className="eyebrow">Contact Hotel Teesta</p>
        <h1>Find us in<br />central Darjeeling.</h1>
        <p className="lead">Hotel Teesta is near the bus stand in Chauk Bazaar, with the town&apos;s central sights within easy reach.</p>
        <div className="contact-lines">
          <div><MapPin /><span><strong>Address</strong>13/1 Botanical Garden Road, opposite Bus Stand, Laldhiki, Chauk Bazaar, Darjeeling 734101</span></div>
          <div><Phone /><span><strong>Call</strong>Direct booking number coming soon</span></div>
          <div><MessageCircle /><span><strong>WhatsApp</strong>WhatsApp booking opens soon</span></div>
        </div>
        <Link href="/stays/teesta" className="button button-primary">Explore Hotel Teesta</Link>
      </section>
      <SiteFooter />
    </main>
  );
}
