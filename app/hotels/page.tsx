import { siteMetadata } from "@/lib/seo";
import { brandedPhoto } from "@/lib/photo-assets";
import Image from "next/image";
import Link from "next/link";
import { EditorialPage } from "@/components/editorial-page";
import { BookingBar } from "@/components/booking-bar";

export const metadata = siteMetadata("/hotels", "Our hotels", "Hotel Teesta and Mainali Hospitality in central Darjeeling.");
export default function HotelsPage() {
  return <EditorialPage title="Our Darjeeling stay." eyebrow="The Mainali collection" intro="Budget-friendly hospitality, in a central Darjeeling location." image="/images/teesta-exterior-front.webp">
    <BookingBar />
    <section className="section-space site-shell editorial-split"><div className="location-photograph"><Image src={brandedPhoto("/images/teesta-double-room-window.webp","card")} alt="Double room at Hotel Teesta" fill sizes="(max-width: 800px) 100vw, 50vw" className="cover-image" style={{objectPosition:"100% 100%"}} /></div><div className="editorial-copy"><p className="eyebrow">Chauk Bazaar · Darjeeling</p><h2>Hotel Teesta</h2><p>A welcoming base opposite the bus stand on Botanical Garden Road. Explore actual room layouts, the lobby and restaurant before you choose your stay.</p><div className="editorial-rates"><div><span>Double Room · Starting direct rate</span><strong>₹2,500+ <small>/ night</small></strong></div></div><Link href="/stays/teesta" className="button button-primary">Explore Hotel Teesta</Link><p className="fine-print">Other room layouts are on request. Availability, taxes and final terms are confirmed before payment.</p></div></section>
  </EditorialPage>;
}
