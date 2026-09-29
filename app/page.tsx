import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BedDouble, MapPin } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Reveal } from "@/components/reveal";

export default function Home() {
  return (
    <main>
      <section className="home-hero">
        <SiteHeader overlay />
        <Image
          src="/images/teesta-exterior.webp"
          alt="Exterior of Hotel Teesta in Darjeeling"
          fill
          priority
          sizes="100vw"
          className="hero-image"
        />
        <div className="hero-shade" />
        <div className="site-shell hero-copy">
          <p className="eyebrow light">Mainali Group of Hotels</p>
          <h1>Stay close to<br />Darjeeling.</h1>
          <p className="hero-intro">Comfortable double rooms from ₹2,500 a night, with solo stays from ₹1,500.</p>
          <Link href="/stays/teesta" className="text-link light-link">
            Discover Hotel Teesta <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className="preview-ribbon">Hotel Teesta · Direct booking opening soon</div>
      </section>

      <section className="booking-band" aria-labelledby="find-stay-title">
        <div className="site-shell">
          <div className="booking-band-heading">
            <p className="eyebrow">Plan your stay</p>
            <h2 id="find-stay-title">Choose your dates</h2>
          </div>
          <SearchForm />
          <p className="booking-note">See a clear starting price for your dates and party size. Final availability is confirmed before payment.</p>
        </div>
      </section>

      <section className="property-feature section-space">
        <div className="site-shell property-layout">
          <Reveal className="property-image-wrap">
            <Image
              src="/images/teesta-double-room.webp"
              alt="A photographed guest room at Hotel Teesta"
              fill
              sizes="(max-width: 800px) 100vw, 56vw"
              className="cover-image"
            />
            <span className="image-caption">Actual Hotel Teesta photography</span>
          </Reveal>
          <Reveal className="property-copy">
            <p className="eyebrow">Our first stay</p>
            <h2>Hotel Teesta</h2>
            <p className="property-place"><MapPin size={17} aria-hidden="true" /> Darjeeling, West Bengal</p>
            <p>A straightforward hill stay with double rooms for solo travellers, couples and groups booking more than one room.</p>
            <div className="property-facts">
              <span><BedDouble size={18} aria-hidden="true" /> Double rooms from ₹2,500 / night</span>
              <span>Single occupancy from ₹1,500 / night</span>
            </div>
            <Link href="/stays/teesta" className="button button-outline">
              View Hotel Teesta <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="promise-section section-space">
        <div className="site-shell promise-layout">
          <p className="eyebrow">The Mainali approach</p>
          <h2>Clear choices.<br />Human hospitality.</h2>
          <p>Only confirmed room details, complete prices and approved policies will appear when direct booking opens.</p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
