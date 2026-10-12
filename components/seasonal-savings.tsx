import { seasonalSavings } from "@/lib/booking-presentation";
import { formatInr } from "@/lib/rates";
import type { InventoryChoice } from "@/lib/reservations";

export function SeasonalSavings({ quote }: { quote: InventoryChoice["quote"] }) {
  const savings = seasonalSavings(quote.subtotalPaise, quote.standardSubtotalPaise);
  if (!savings) return null;
  return <div className="seasonal-savings">
    <span>Standard room total <del>{formatInr(quote.standardSubtotalPaise!)}</del></span>
    <strong>Save {formatInr(savings)} with the seasonal rate</strong>
    <small>Applies to your selected stay dates. Savings exclude taxes.</small>
  </div>;
}
