import Image from "next/image";
import Link from "next/link";
import { BookingBar } from "@/components/booking-bar";
import { HeroPhotographs } from "@/components/hero-photographs";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StickyBooking } from "@/components/sticky-booking";
import { HotelFAQ } from "@/components/sections/HotelFAQ";
import { publicTeesta, publishedRateStatement, startingPrice, hotelAddress, hotelMapUrl } from "@/lib/hotel-content";
import { siteCopy } from "@/lib/site-copy";
import { brandedPhoto } from "@/lib/photo-assets";
import { siteMetadata, siteOrigin } from "@/lib/seo";
export const metadata = siteMetadata("/", "Mainali Hospitality · Hotel Teesta, Darjeeling", "Explore Hotel Teesta in Chauk Bazaar, Darjeeling. Real room photographs, published starting rates and direct stay planning.");
export default function Home() {
  return <main className="mainali-public-page"><SiteHeader overlay home />
    <section className="mainali-hero" aria-labelledby="home-title"><HeroPhotographs /><div className="mainali-hero-copy site-shell"><p className="eyebrow">{siteCopy.heroEyebrow}</p><h1 id="home-title">{siteCopy.heroTitle}</h1><p>{siteCopy.heroLead}</p></div></section>
    <BookingBar />
    <ul className="plain-facts site-shell"><li>From {startingPrice} a night · for 1 guest</li><li>{publicTeesta.inventoryCount} rooms · 4 photographed layouts</li><li>Online payment being prepared</li></ul>
    <section className="section-space site-shell" aria-labelledby="home-rooms"><h2 id="home-rooms">{siteCopy.roomTitle}</h2><div className="room-layout-grid">{publicTeesta.rooms.filter(room => room.photo).map(room => <article className="room-layout-card" key={room.id}>
      <Link href="/stays/teesta#check-rooms" className="room-layout-photo" aria-label={"Choose dates for " + room.name}><Image src={brandedPhoto(room.photo!, "card")} alt={room.name + " at Hotel Teesta"} fill sizes="(min-width:900px) 25vw, (min-width:640px) 50vw, 82vw" className="cover-image" /></Link>
      <h3>{room.name}</h3><p>Sleeps {room.maxGuests} · {room.bedConfiguration}</p><Link href="/stays/teesta#check-rooms" className="text-link">See dates</Link>
    </article>)}</div><p className="fine-print room-layout-note">{publishedRateStatement} Category availability and final prices are checked for your dates.</p></section>
    <section className="section-space site-shell editorial-split" aria-labelledby="home-location"><div className="location-photograph"><Image src={brandedPhoto("/images/teesta-exterior-front.webp", "card")} alt="Front of Hotel Teesta opposite the bus stand" fill sizes="(min-width:900px) 50vw,100vw" className="cover-image" /></div><div><h2 id="home-location">{siteCopy.locationTitle}</h2><p>{siteCopy.locationBody}</p><p>{hotelAddress}</p><a href={hotelMapUrl} className="text-link">Get directions</a></div></section>
    <section className="section-space site-shell" aria-labelledby="home-photos"><h2 id="home-photos">Have a look around.</h2><div className="spaces-grid">{[["Lobby","teesta-lobby"],["Restaurant","teesta-dining-room"],["Front desk","teesta-reception-desk"],["Exterior","teesta-exterior-front"]].map(([label,photo]) => <Link className="space-link" href="/stays/teesta#photos" key={photo}><Image src={brandedPhoto("/images/" + photo + ".webp", "card")} alt={label + " at Hotel Teesta"} fill sizes="(min-width:900px) 25vw,82vw" className="cover-image" /><span>{label}</span></Link>)}</div></section>
    <div className="section-space site-shell"><HotelFAQ faqs={publicTeesta.faqs.slice(0,4)} pageUrl={siteOrigin() + "/"} /><Link href="/policies/refunds" className="text-link">Read cancellation and refund terms</Link></div>
    <section className="mainali-final-cta section-space site-shell"><h2>{siteCopy.closingTitle}</h2><a href="#check-rooms" className="button button-primary">Check availability</a></section>
    <SiteFooter /><StickyBooking />
  </main>;
}
