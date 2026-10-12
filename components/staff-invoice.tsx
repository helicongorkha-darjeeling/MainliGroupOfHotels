"use client";

import { Printer } from "lucide-react";
import { Brand } from "./brand";
import type { PrintableInvoice } from "@/lib/staff-types";
import { formatInr } from "@/lib/rates";
import { formatHotelDate, nightsBetween } from "@/lib/stay";
import { staffTimestamp } from "./staff-ui";

export function StaffInvoice({ invoice }: { invoice: PrintableInvoice }) {
  const { snapshot } = invoice, folio = snapshot.folio;
  const credit = folio.credit_paise ?? Math.max(0, folio.paid_paise - folio.total_paise);
  return <div className="staff-app staff-invoice">
    <div className="staff-invoice-tools staff-print-hide"><button type="button" className="staff-primary" onClick={() => window.print()}><Printer size={20} aria-hidden="true" /> Print invoice</button></div>
    <article className="staff-invoice-paper">
      <header><Brand /><h1>Invoice</h1><p><strong>{invoice.number}</strong></p><p>Issued {staffTimestamp(invoice.issued_at)}</p></header>
      <section className="staff-invoice-parties"><div><h2>{snapshot.legal_name}</h2><p>{snapshot.legal_address}</p>{snapshot.gstin && <p>GSTIN: {snapshot.gstin}</p>}</div><div><h2>Bill to</h2><p>{snapshot.guest_name}</p><p>{snapshot.address}</p></div></section>
      <section><h2>Stay</h2><p>{formatHotelDate(snapshot.check_in)} — {formatHotelDate(snapshot.check_out)} · {nightsBetween(snapshot.check_in, snapshot.check_out)} night{nightsBetween(snapshot.check_in, snapshot.check_out) === 1 ? "" : "s"}</p><p>Room{snapshot.rooms.length === 1 ? "" : "s"} {snapshot.rooms.join(", ")}</p></section>
      <section className="staff-folio"><h2>Charges</h2><dl>{snapshot.nightly_prices?.length ? snapshot.nightly_prices.map(night => <div key={night.date}><dt>Room · {formatHotelDate(night.date)}<small> {night.rateName}</small></dt><dd>{formatInr(night.amountPaise)}</dd></div>) : <div><dt>Room nights</dt><dd>{formatInr(folio.room_subtotal_paise)}</dd></div>}{(snapshot.items || []).map((item, index) => <div key={`${index}-${item.description}`}><dt>{item.description}{item.kind === "discount" ? " (discount)" : ""}</dt><dd>{item.kind === "discount" ? "−" : ""}{formatInr(item.amount_paise)}</dd></div>)}<div><dt>Taxable value</dt><dd>{formatInr(folio.taxable_paise)}</dd></div><div><dt>GST {folio.tax_rate_bps === null ? "" : `(${folio.tax_rate_bps / 100}%)`}</dt><dd>{folio.tax_paise === null ? "Not approved" : formatInr(folio.tax_paise)}</dd></div><div className="staff-folio-total"><dt>Total</dt><dd>{formatInr(folio.total_paise)}</dd></div><div><dt>Amount paid</dt><dd>{formatInr(folio.paid_paise)}</dd></div><div className="staff-balance"><dt>Balance</dt><dd>{formatInr(folio.balance_paise)}</dd></div>{credit > 0 && <div><dt>Credit / refund review</dt><dd>{formatInr(credit)}</dd></div>}</dl></section>
      {(snapshot.payments || []).length > 0 && <section><h2>Payments</h2>{snapshot.payments?.map((payment, index) => <div className="staff-payment-entry" key={`${index}-${payment.received_at}`}><p><strong>{formatInr(payment.amount_paise)}</strong> · {payment.method.replaceAll("_", " ")}</p><p>{payment.reference || ""} · {staffTimestamp(payment.received_at)}</p></div>)}</section>}
      <footer><p>Thank you for staying with Mainali Hospitality.</p></footer>
    </article>
  </div>;
}
