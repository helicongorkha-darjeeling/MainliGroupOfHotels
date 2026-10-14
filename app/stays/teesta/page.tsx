import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BookingBar } from "@/components/booking-bar";
import { PropertyGallery } from "@/components/property-gallery";
import { StickyBooking } from "@/components/sticky-booking";
import { HotelJsonLd } from "@/components/seo/HotelJsonLd";
import { HotelFAQ } from "@/components/sections/HotelFAQ";
import { RoomComparisonTable } from "@/components/rooms/RoomComparisonTable";
import { AmenityBulletList } from "@/components/rooms/AmenityBulletList";
import { publicTeesta, hotelAddress, hotelMapUrl, publishedRateStatement, roomStartingPrice } from "@/lib/hotel-content";
import { teesta } from "@/lib/property";
import { brandedPhoto } from "@/lib/photo-assets";
import { siteOrigin, siteMetadata } from "@/lib/seo";
export const metadata = siteMetadata("/stays/teesta", "Hotel Teesta, Darjeeling", publicTeesta.description);
export default function TeestaPage() {
  return <main className="mainali-public-page"><SiteHeader overlay /><HotelJsonLd hotel={publicTeesta} />
    <section className="mainali-property-hero" aria-labelledby="property-title"><picture className="hero-picture"><source media="(min-width:640px)" srcSet={brandedPhoto(teesta.publicRoom.photo,"hero")} /><Image src={brandedPhoto(teesta.publicRoom.photo,"hero-mobile")} alt="Hotel Teesta double room" fill preload sizes="100vw" className="cover-image" /></picture><div className="mainali-hero-shade" /><div className="mainali-hero-copy site-shell"><p className="eyebrow">Chauk Bazaar · Darjeeling</p><h1 id="property-title">{publicTeesta.name}</h1><p>{publicTeesta.description}</p></div></section>
    <BookingBar variant="inline" />
    <nav className="property-section-nav" aria-label="Explore Hotel Teesta"><a href="#room-layouts">Rooms</a><a href="#photos">Photos</a><a href="#location">Location</a><Link href="/policies/booking-terms">Booking terms</Link></nav>
    <section id="room-layouts" className="section-space site-shell"><h2>Choose your room layout.</h2><p>{publicTeesta.inventoryCount} rooms. Reception assigns your physical room after booking.</p><div className="room-layout-grid">{publicTeesta.rooms.map(room => <article className="room-layout-card" key={room.id}><div className="room-layout-photo">{room.photo ? <Image src={brandedPhoto(room.photo,"card")} alt={room.name + " at Hotel Teesta"} fill sizes="(min-width:900px)25vw,(min-width:640px)50vw,82vw" className="cover-image" /> : <div className="room-placeholder">Six-person layout · photograph on request</div>}</div><h3>{room.name}</h3><p>{room.description}</p><p>Up to {room.maxGuests} guests · {room.bedConfiguration}</p><p>{roomStartingPrice(room)}</p><a href="#check-rooms" className="text-link">See dates</a></article>)}</div><p className="fine-print room-layout-note">{publishedRateStatement}</p><RoomComparisonTable rooms={publicTeesta.rooms} /></section>
    <section className="section-space site-shell" aria-labelledby="amenities-title"><h2 id="amenities-title">Hotel amenities</h2><AmenityBulletList amenities={publicTeesta.amenities} /></section>
    <section id="photos" className="section-space site-shell"><h2>Take a closer look.</h2><p>Actual rooms, bathroom, lobby, restaurant and front desk.</p><PropertyGallery photos={teesta.gallery} /></section>
    <section id="location" className="section-space site-shell"><h2>Find Hotel Teesta.</h2><address>{hotelAddress}</address><a href={hotelMapUrl} className="text-link">Get directions</a>
      {publicTeesta.telephone && <p>Telephone: <a href={"tel:" + publicTeesta.telephone}>{publicTeesta.telephone}</a></p>}
      {publicTeesta.geo && <p>Coordinates: {publicTeesta.geo.latitude}, {publicTeesta.geo.longitude}</p>}
      {publicTeesta.checkinTime && <p>Check-in: {publicTeesta.checkinTime}</p>}{publicTeesta.checkoutTime && <p>Checkout: {publicTeesta.checkoutTime}</p>}
      {publicTeesta.aggregateRating && <p>Guest rating: {publicTeesta.aggregateRating.ratingValue} / 5 · {publicTeesta.aggregateRating.reviewCount} reviews · {publicTeesta.aggregateRating.source}</p>}
      {publicTeesta.venue && <div><h3>{publicTeesta.venue.name}</h3><p>{publicTeesta.venue.description}</p><p>Maximum event capacity: {publicTeesta.venue.capacity} guests</p></div>}
    </section>
    <div className="section-space site-shell"><HotelFAQ faqs={publicTeesta.faqs} pageUrl={siteOrigin() + publicTeesta.canonicalPath} /><Link className="text-link" href="/policies/refunds">Cancellation and refund terms</Link></div><SiteFooter /><StickyBooking />
  </main>;
}
