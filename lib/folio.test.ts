import { describe, expect, it } from "vitest";
import { folioAmounts, invoiceFinancialYear } from "./folio";
describe("folio amounts", () => {
  it("adds extras and subtracts approved discounts before tax, using integer paise", () => {
    expect(folioAmounts(250000, 30000, 10000, 100000, 500)).toEqual({ taxablePaise: 270000, taxPaise: 13500, totalPaise: 283500, paidPaise: 100000, balancePaise: 183500, creditPaise: 0, taxConfirmed: true });
  });
  it("rounds half a paise once and does not accumulate floating point error", () => {
    expect(folioAmounts(101, 0, 0, 0, 500).taxPaise).toBe(5);
    expect(folioAmounts(110, 0, 0, 0, 500).taxPaise).toBe(6);
  });
  it("keeps unapproved tax distinct from an approved zero rate", () => {
    expect(folioAmounts(200000, 0, 0, 0, null)).toMatchObject({ taxPaise: null, taxConfirmed: false });
    expect(folioAmounts(200000, 0, 0, 0, 0)).toMatchObject({ taxPaise: 0, taxConfirmed: true });
  });
  it("retains overpayment as credit and rejects impossible amounts", () => {
    expect(folioAmounts(100, 0, 0, 120, 0)).toMatchObject({ balancePaise: 0, creditPaise: 20 });
    expect(() => folioAmounts(100, 0, 101, 0, 0)).toThrow();
    expect(() => folioAmounts(1.1, 0, 0, 0, 0)).toThrow();
    expect(() => folioAmounts(100, 0, 0, 0, -1)).toThrow();
  });
});
describe("invoice financial year", () => {
  it("changes at Indian midnight on April 1, independent of server time zone", () => {
    expect(invoiceFinancialYear(new Date("2026-03-31T18:29:59Z"))).toBe("2025-26");
    expect(invoiceFinancialYear(new Date("2026-03-31T18:30:00Z"))).toBe("2026-27");
    expect(invoiceFinancialYear(new Date("2026-10-12T12:00:00Z"))).toBe("2026-27");
  });
});
