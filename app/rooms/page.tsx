import Image from "next/image";
import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SeasonalSavings } from "@/components/seasonal-savings";
import { getTeestaRoomType } from "@/lib/room-types";
import { publicTeesta } from "@/lib/hotel-content";
import { searchInventory } from "@/lib/server/reservations";
import { isAvailable } from "@/lib/reservations";
import { sharedStayQuote } from "@/lib/room-price-summary";
import { brandedPhoto } from "@/lib/photo-assets";
import { formatInr } from "@/lib/rates";
import { nightsBetween, staySearchSchema } from "@/lib/stay";
export const metadata = { title: "Choose your room", robots: { index: false, follow: false } };
export default async function RoomsPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const raw = { checkIn: typeof params.checkIn === "string" ? params.checkIn : "", checkOut: typeof params.checkOut === "string" ? params.checkOut : "", guests: typeof params.guests === "string" ? params.guests : "2" };
  const parsed = staySearchSchema.safeParse(raw), nights = parsed.success ? nightsBetween(parsed.data.checkIn,parsed.data.checkOut) : 0;
  const inventory = parsed.success ? await searchInventory(parsed.data.checkIn,parsed.data.checkOut,parsed.data.guests) : null;
  const recommended = inventory?.choices.find(isAvailable)?.code;
  const common = sharedStayQuote(inventory?.choices ?? []);
  const query = parsed.success ? new URLSearchParams({checkIn:parsed.data.checkIn,checkOut:parsed.data.checkOut,guests:String(parsed.data.guests)}).toString() : "";
  return <main className="mainali-public-page"><SiteHeader />
    <section className="rooms-head site-shell"><Link href="/stays/teesta" className="back-link">← Hotel Teesta</Link><h1>Choose your room</h1></section>
    <section className="modify-search site-shell"><SearchForm key={raw.checkIn+"/"+raw.checkOut+"/"+raw.guests} compact initialCheckIn={raw.checkIn} initialCheckOut={raw.checkOut} initialGuests={raw.guests} /></section>
    <section className="results-section section-space site-shell">
      {parsed.success && <p>Your stay: {common && <strong>{formatInr(common.totalPaise)} · </strong>}{parsed.data.guests} guests, {nights} {nights === 1 ? "night" : "nights"}{!common && " · prices shown by room"}</p>}
      {inventory?.choices.some(choice => choice.bookable && !choice.quote.taxConfirmed) && <p className="fine-print">Taxes are awaiting hotel confirmation. The final payable total will be shown before payment.</p>}
      {parsed.success && !inventory ? <p className="preview-alert">Availability could not be loaded. Please retry your search; no room has been held.</p> : parsed.success && inventory ? <div className="room-results">{inventory.choices.map(choice => {
        const room = getTeestaRoomType(choice.code), facts = publicTeesta.rooms.find(item => item.id === choice.code);
        if (!room || !facts) return null;
        const available = isAvailable(choice);
        return <article className="room-result" key={room.id}><div className="room-result-image">{facts.photo ? <Image src={brandedPhoto(facts.photo,"card")} alt={facts.name + " at Hotel Teesta"} fill sizes="(min-width:900px)280px,100vw" className="cover-image" /> : <div className="room-placeholder">{facts.name} · bed layout and photo on request</div>}</div>
          <div className="room-result-body">{recommended === room.id && <span className="room-kicker">Recommended</span>}<h3>{facts.name}</h3><p>Sleeps {facts.maxGuests} · {facts.bedConfiguration}</p><p>{choice.rooms} {choice.rooms === 1 ? "room" : "rooms"} for your party</p>{available && choice.availableRooms <= 3 && <span className="room-availability-low">Only {choice.availableRooms} {choice.availableRooms === 1 ? "room" : "rooms"} left</span>}</div>
          <div className="room-result-action">{choice.bookable && !common && <><span>Stay total · {nights} {nights === 1 ? "night" : "nights"}</span><strong>{formatInr(choice.quote.totalPaise)}</strong></>}<SeasonalSavings quote={choice.quote} />
            {available ? <Link href={`/book?${query}&roomType=${room.id}`} className="button button-primary" aria-label={"Choose " + facts.name}>Choose this room</Link> : <span className="room-unavailable">{choice.bookable ? "Full on these dates" : "Not open online · on request"}</span>}
          </div></article>;
      })}</div> : <p>Choose your dates and guest count above to check rooms and prices.</p>}
    </section><SiteFooter />
  </main>;
}
