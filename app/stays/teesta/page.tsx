import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, IndianRupee, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { SearchForm } from "@/components/search-form";
import { PropertyGallery } from "@/components/property-gallery";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { teesta } from "@/lib/property";

export const metadata: Metadata = {
  title: "Hotel Teesta, Darjeeling",
  description: "Explore Hotel Teesta, the first property in the Mainali collection.",
};

export default function TeestaPage() {
  return (
    <main>
      <SiteHeader />
      <section className="property-hero site-shell">
        <div className="property-hero-copy">
          <p className="eyebrow">Mainali · First property</p>
          <h1>Hotel Teesta</h1>
          <p className="location-line"><MapPin size={18} aria-hidden="true" /> Darjeeling, West Bengal</p>
          <p>{teesta.summary}</p>
          <a href="#check-rooms" className="button button-primary">Check rooms <ArrowRight size={17} /></a>
        </div>
        <div className="property-hero-image">
          <Image src={teesta.publicRoom.photo} alt="Double room with a window at Hotel Teesta" fill preload sizes="(max-width: 800px) 100vw, 55vw" className="cover-image" style={{ objectPosition: "50% 65%" }} />
          <span className="image-caption">Actual property photograph</span>
        </div>
      </section>

      <section id="photos" className="gallery-section section-space" aria-labelledby="gallery-title">
        <div className="site-shell">
          <div className="section-heading-row">
            <div><p className="eyebrow">Inside the stay</p><h2 id="gallery-title">Take a closer look.</h2></div>
            <p>Explore the rooms and spaces at Hotel Teesta. Tap any photograph to see the full view.</p>
          </div>
          <PropertyGallery photos={teesta.gallery} />
        </div>
      </section>

      <section className="room-offer section-space" aria-labelledby="rooms-title">
        <div className="site-shell room-offer-layout">
          <Reveal className="room-offer-image">
            <Image src={teesta.publicRoom.photo} alt="Double room at Hotel Teesta" fill sizes="(max-width: 800px) 100vw, 48vw" className="cover-image" style={{ objectPosition: "50% 65%" }} />
          </Reveal>
          <Reveal className="room-offer-copy">
            <p className="eyebrow">Stay your way</p>
            <h2 id="rooms-title">A comfortable double room.</h2>
            <p>{teesta.publicRoom.description}</p>
            <div className="rate-lines">
              <div><span>One or two guests</span><strong>₹2,500+</strong><small>per room · per night</small></div>
              <div><span>Single occupancy</span><strong>₹1,500+</strong><small>per room · per night</small></div>
            </div>
            <a href="#check-rooms" className="button button-primary">Check your dates <ArrowRight size={17} /></a>
          </Reveal>
        </div>
      </section>

      <section className="essentials section-space" aria-labelledby="essentials-title">
        <div className="site-shell essentials-layout">
          <div>
            <p className="eyebrow">Before you book</p>
            <h2 id="essentials-title">Stay essentials</h2>
          </div>
          <div className="essentials-list">
            <div><BedDouble aria-hidden="true" /><h3>Double rooms</h3><p>Each room is priced for up to two guests.</p></div>
            <div><UserRound aria-hidden="true" /><h3>Solo stays</h3><p>One guest can book a room from ₹1,500 per night.</p></div>
            <div><IndianRupee aria-hidden="true" /><h3>Clear starting price</h3><p>Your dates and guest count calculate the stay price before booking.</p></div>
            <div><ShieldCheck aria-hidden="true" /><h3>Confirm before payment</h3><p>Availability, final amount and applicable policies are shown before payment.</p></div>
          </div>
        </div>
      </section>

      <section id="check-rooms" className="property-search section-space">
        <div className="site-shell">
          <p className="eyebrow light">Plan ahead</p>
          <h2>Find your dates</h2>
          <p>Choose your dates and guests to see the starting price for your stay.</p>
          <SearchForm compact />
        </div>
      </section>

      <section className="info-strip">
        <div className="site-shell info-grid">
          <div><h2>Location</h2><p>Chauk Bazaar, Darjeeling<br /><span>Opposite the bus stand on Botanical Garden Road.</span></p></div>
          <div><h2>Contact</h2><p><Link href="/contact">View address</Link><br /><span>Direct phone and WhatsApp booking open soon.</span></p></div>
          <div><h2>Policies</h2><p><Link href="/policies/booking-terms">Booking terms</Link> · <Link href="/policies/refunds">Refunds</Link><br /><span>Final terms are shown before confirmation.</span></p></div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
