import { publicTeesta, hotelAddress } from "@/lib/hotel-content";
import { siteCopy } from "@/lib/site-copy";
import { siteMetadata } from "@/lib/seo";
import Link from "next/link";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = siteMetadata("/contact", "Contact Hotel Teesta", "Hotel Teesta and Mainali Hospitality in central Darjeeling.");

export default function ContactPage() {
  return (
    <main className="mainali-public-page">
      <SiteHeader />
      <section className="simple-page site-shell">
        <p className="eyebrow">Contact Hotel Teesta</p>
        <h1>Find us in<br />central Darjeeling.</h1>
        <p className="lead">Hotel Teesta is near the bus stand in Chauk Bazaar, with the town&apos;s central sights within easy reach.</p>
        <div className="contact-lines">
          <div><MapPin /><span><strong>Address</strong>{hotelAddress}</span></div>
          <div><Phone /><span><strong>Call</strong>{publicTeesta.telephone ?? siteCopy.telephonePlaceholder}</span></div>
          <div><MessageCircle /><span><strong>WhatsApp</strong>{publicTeesta.whatsapp ?? siteCopy.whatsappPlaceholder}</span></div>
        </div>
        <Link href="/stays/teesta" className="button button-primary">Explore Hotel Teesta</Link>
      </section>
      <SiteFooter />
    </main>
  );
}
