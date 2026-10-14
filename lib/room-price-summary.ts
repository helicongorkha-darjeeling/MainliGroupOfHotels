import type { InventoryChoice } from "./reservations";
export function sharedStayQuote(choices: InventoryChoice[]) {
  const bookable = choices.filter(choice => choice.bookable);
  const first = bookable[0]?.quote;
  return first && bookable.every(choice => choice.quote.totalPaise === first.totalPaise && choice.quote.taxConfirmed === first.taxConfirmed)
    ? { totalPaise: first.totalPaise, taxConfirmed: first.taxConfirmed } : null;
}
