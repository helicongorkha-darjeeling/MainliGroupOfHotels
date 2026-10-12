/** Integer paise throughout. Rates are owner-approved basis points, never a default GST rate. */
export function folioAmounts(roomPaise: number, extrasPaise: number, discountPaise: number, paidPaise: number, taxRateBps: number | null) {
  for (const value of [roomPaise, extrasPaise, discountPaise, paidPaise]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid amount");
  }
  if (taxRateBps !== null && (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10000)) throw new Error("Invalid tax rate");
  const taxablePaise = roomPaise + extrasPaise - discountPaise;
  if (!Number.isSafeInteger(taxablePaise) || taxablePaise < 0) throw new Error("Discount exceeds charges");
  const taxPaise = taxRateBps === null ? null : Number((BigInt(taxablePaise) * BigInt(taxRateBps) + BigInt(5000)) / BigInt(10000));
  const totalPaise = taxablePaise + (taxPaise ?? 0);
  if (!Number.isSafeInteger(totalPaise)) throw new Error("Amount too large");
  return { taxablePaise, taxPaise, totalPaise, paidPaise, balancePaise: Math.max(0, totalPaise - paidPaise), creditPaise: Math.max(0, paidPaise - totalPaise), taxConfirmed: taxRateBps !== null };
}

export function invoiceFinancialYear(date: Date) {
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid invoice date");
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "numeric", timeZone: "Asia/Kolkata" }).formatToParts(date);
  const year = Number(parts.find(part => part.type === "year")?.value);
  const month = Number(parts.find(part => part.type === "month")?.value);
  const start = month < 4 ? year - 1 : year;
  return `${start}-${String(start + 1).slice(-2)}`;
}
