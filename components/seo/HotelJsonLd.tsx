import { buildHotelGraph, serializeJsonLd } from "@/lib/hotel-schema";
import type { PublicHotel } from "@/lib/hotel-content";
import { siteOrigin } from "@/lib/seo";
export function HotelJsonLd({ hotel, origin = siteOrigin() }: { hotel: PublicHotel; origin?: string }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildHotelGraph(hotel, origin)) }} />;
}

