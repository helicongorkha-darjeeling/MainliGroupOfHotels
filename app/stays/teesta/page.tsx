import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BookingBar } from "@/components/booking-bar";
import { PropertyGallery } from "@/components/property-gallery";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { teesta } from "@/lib/property";
import { teestaRoomTypes } from "@/lib/room-types";

export const metadata: Metadata = { title: "Hotel Teesta, Darjeeling", description: "Explore real room photographs and plan your stay at Hotel Teesta in Chauk Bazaar, Darjeeling." };

export default function TeestaPage() {
  return <main className="mainali-public-page">
    <SiteHeader overlay />
    <section className="mainali-property-hero" aria-labelledby="property-title">
      <Image src={teesta.publicRoom.photo} alt="Double room beside a window at Hotel Teesta" fill preload sizes="100vw" className="cover-image" style={{objectPosition:"50% 65%"}} />
      <div className="mainali-hero-shade" />
      <div className="mainali-hero-copy site-shell"><p className="eyebrow">Darjeeling, West Bengal</p><h1 id="property-title">Hotel Teesta</h1><p>A welcoming hill stay in Chauk Bazaar.<br />Choose a room that feels right for your journey.</p><a href="#check-rooms" className="button hero-outline">Plan your stay</a></div>
    </section>
    <BookingBar />
    <nav className="property-section-nav" aria-label="Explore Hotel Teesta"><a href="#room-layouts">Rooms</a><a href="#photos">Photographs</a><a href="#location">Location</a><Link href="/policies/booking-terms">Booking terms</Link></nav>
    <section id="room-layouts" className="section-space site-shell" aria-labelledby="rooms-title">
      <div className="editorial-heading"><p className="eyebrow">Stay your way</p><h2 id="rooms-title">Space for every journey.</h2><p>Choose a room layout, not a room number. Reception allots your room later.</p></div>
      <div className="room-layout-grid">{teestaRoomTypes.map((room) => <Reveal className="room-layout-card" key={room.id}><a href="#check-rooms" className="room-layout-photo" aria-label={"Choose dates for " + room.name}><Image src={room.photo} alt={room.name + " at Hotel Teesta"} fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 25vw" className="cover-image" style={{objectPosition:room.position}} /></a><p className="eyebrow">Up to {room.maxGuests} guests per room</p><h3>{room.name}</h3><p>{room.description}</p><strong>{room.id === "double-room" ? "From ₹2,500+ / room / night" : "Rate on request"}</strong><a href="#check-rooms" className="text-link">Choose dates <ArrowUpRight size={16} aria-hidden="true" /></a></Reveal>)}</div>
      <p className="fine-print room-layout-note">Room layouts are shown from the owner’s photographs. Starting rates are not a live availability promise. Final rates, taxes and policies must be confirmed before payment.</p>
    </section>
    <section id="photos" className="gallery-section section-space" aria-labelledby="gallery-title"><div className="site-shell"><div className="editorial-heading"><p className="eyebrow">Inside Hotel Teesta</p><h2 id="gallery-title">Take a closer look.</h2><p>Our actual rooms, bathroom, lobby, restaurant and front desk. Tap a photograph for the full view.</p></div><PropertyGallery photos={teesta.gallery} /></div></section>
    <section id="location" className="section-space site-shell editorial-split location-section" aria-labelledby="location-title"><Reveal className="location-photograph"><Image src="/images/teesta-exterior-front.webp" alt="Hotel Teesta opposite the bus stand in Chauk Bazaar" fill sizes="(max-width: 800px) 100vw, 50vw" className="cover-image" /></Reveal><Reveal className="editorial-copy"><p className="eyebrow">Find your way</p><h2 id="location-title">In the heart<br />of Chauk Bazaar.</h2><p>Hotel Teesta, Botanical Garden Road, Darjeeling, West Bengal. Opposite the bus stand.</p><Link href="/contact" className="button button-outline">Location &amp; enquiries <ArrowUpRight size={16} aria-hidden="true" /></Link><p className="fine-print">Direct online confirmation and payment are still being set up. No room is reserved by browsing or reviewing checkout.</p></Reveal></section>
    <SiteFooter />
  </main>;
}
