import type { AmenityFact } from "@/lib/hotel-content";
export function AmenityBulletList({ amenities }: { amenities: AmenityFact[] }) {
  return <ul className="amenity-facts grid gap-4 sm:grid-cols-2">{amenities.map(fact => <li key={fact.label}><strong>{fact.label}:</strong> {fact.value}</li>)}</ul>;
}

