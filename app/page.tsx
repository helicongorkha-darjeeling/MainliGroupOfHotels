import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BookingBar } from "@/components/booking-bar";
import { HeroPhotographs } from "@/components/hero-photographs";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const spaces = [
  { title: "The lobby", eyebrow: "Arrive", photo: "teesta-lobby", description: "A closer look at where your stay begins." },
  { title: "The restaurant", eyebrow: "Gather", photo: "teesta-dining-room", description: "Explore Teesta’s dining space before you arrive." },
  { title: "The front desk", eyebrow: "Welcome", photo: "teesta-reception-desk", description: "Your room is allotted by the front desk, not online." },
];

export default function Home() {
  return <main className="mainali-public-page">
    <SiteHeader overlay />
    <section className="mainali-hero" aria-labelledby="home-title">
      <HeroPhotographs />
      <div className="mainali-hero-copy site-shell">
        <p className="eyebrow">Welcome to Mainali</p>
        <h1 id="home-title">Timeless hospitality,<br /> from the Darjeeling hills.</h1>
        <p>Your budget-friendly stay in central Darjeeling. Real rooms, familiar warmth, and a little more time for the hills.</p>
        <Link href="/stays/teesta" className="button hero-outline">Discover Hotel Teesta</Link>
      </div>
    </section>
    <BookingBar />
    <section className="mainali-introduction section-space site-shell" aria-labelledby="welcome-title">
      <Reveal><p className="eyebrow">A welcome from the hills</p><h2 id="welcome-title">Every journey deserves<br />a place to feel at home.</h2><span className="gold-divider" /><p>Discover Hotel Teesta in Chauk Bazaar, Darjeeling. Take a look around our rooms and hotel spaces, choose the layout that suits your party, and plan your stay with clear starting prices.</p></Reveal>
    </section>
    <section className="mainali-feature section-space" aria-labelledby="teesta-title">
      <div className="site-shell editorial-split">
        <Reveal className="editorial-photographs">
          <div className="editorial-main-photo"><Image src="/images/teesta-double-room-window.webp" alt="Hotel Teesta double room with wooden furniture and a window" fill sizes="(max-width: 800px) 100vw, 45vw" className="cover-image" style={{objectPosition:"50% 65%"}} /></div>
          <div className="editorial-inset-photo"><Image src="/images/teesta-exterior-front.webp" alt="The exterior of Hotel Teesta" fill sizes="(max-width: 800px) 40vw, 22vw" className="cover-image" /></div>
        </Reveal>
        <Reveal className="editorial-copy">
          <p className="eyebrow">Our Darjeeling stay</p><h2 id="teesta-title">Hotel Teesta</h2><p className="editorial-location">Chauk Bazaar · Darjeeling, West Bengal</p>
          <p>For a solo visit, time together, or a family journey. See our actual room photographs and find the right layout before you book.</p>
          <div className="editorial-rates"><div><span>Double Room · Direct starting rate</span><strong>₹2,500+ <small>/ night</small></strong></div></div>
          <p className="fine-print">Double Room starting rates. Other layouts are on request; final rates, taxes and availability are confirmed before payment.</p>
          <Link href="/stays/teesta" className="button button-primary">Explore the hotel <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </Reveal>
      </div>
    </section>
    <section className="mainali-spaces section-space" aria-labelledby="spaces-title">
      <div className="site-shell"><div className="editorial-heading"><p className="eyebrow">Beyond the room</p><h2 id="spaces-title">Get to know your stay.</h2></div>
        <div className="spaces-grid">{spaces.map((space) => <Link href="/stays/teesta#photos" className="space-link" key={space.title}><Image src={"/images/" + space.photo + ".webp"} alt={space.title + " at Hotel Teesta"} fill sizes="(max-width: 640px) 100vw, 33vw" className="cover-image" /><div><p className="eyebrow">{space.eyebrow}</p><h3>{space.title}</h3><p>{space.description}</p><span>View photographs <ArrowUpRight size={16} aria-hidden="true" /></span></div></Link>)}</div>
      </div>
    </section>
    <section className="mainali-final-cta section-space site-shell"><p className="eyebrow">Your next hill stay</p><h2>A room for your journey.</h2><p>Choose your dates, explore the layouts, and review your stay before any payment.</p><a href="#check-rooms" className="button button-primary">Plan your stay</a><Link href="/contact" className="text-link">Find Hotel Teesta <ArrowUpRight size={16} aria-hidden="true" /></Link></section>
    <SiteFooter />
  </main>;
}
