import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EditorialPage } from "@/components/editorial-page";

export const metadata: Metadata = { title: "Experiences at Hotel Teesta" };
const spaces = [
  { title: "A warm arrival", image: "teesta-lobby", copy: "Step inside Teesta’s lobby and see the seating and wooden windows in our actual property photographs." },
  { title: "Time around the table", image: "teesta-dining-room", copy: "A look inside the restaurant. Menus, meal inclusions and opening times should be confirmed with the hotel." },
  { title: "A room for your journey", image: "teesta-family-sofa-room", copy: "Explore the different room layouts, from a double bed to a larger family space." },
];
export default function ExperiencesPage() {
  return <EditorialPage title="The stay, beyond your room." eyebrow="Inside Hotel Teesta" intro="Real spaces. A familiar welcome. A central base for your Darjeeling visit." image="/images/teesta-lobby.webp"><section className="section-space site-shell"><div className="spaces-grid">{spaces.map((space) => <Link href="/stays/teesta#photos" className="space-link" key={space.title}><Image src={"/images/" + space.image + ".webp"} alt={space.title + " at Hotel Teesta"} fill sizes="(max-width: 640px) 100vw, 33vw" className="cover-image" /><div><h3>{space.title}</h3><p>{space.copy}</p><span>Explore photographs</span></div></Link>)}</div></section></EditorialPage>;
}
