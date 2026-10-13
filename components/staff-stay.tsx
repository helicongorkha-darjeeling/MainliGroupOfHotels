"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Phone, CreditCard, ReceiptText, Plus, Utensils } from "lucide-react";
import type { Reservation } from "@/lib/reservations";
import type { HotelOperationsData } from "@/lib/staff-types";
import { formatInr } from "@/lib/rates";
import { formatHotelDate, hotelToday } from "@/lib/stay";
import { StaffHeading, StaffNotice, StaffStatus, staffTimestamp, useStaffRequest } from "./staff-ui";
import { StaffCheckIn, sourceLabels } from "./staff-check-in";

export function StaffStay({ reservation, data, onBack, embedded = false }: { reservation: Reservation; data: HotelOperationsData; onBack?: () => void; embedded?: boolean }) {
  const router = useRouter(), request = useStaffRequest();
  const [panel, setPanel] = useState<"details" | "check_in" | "payment" | "food">("details");
  const [pending, setPending] = useState(false), submitting = useRef(false);
  const [notice, setNotice] = useState({ text: "", error: false });
  const [payment, setPayment] = useState<{ url?: string; imageUrl?: string; amountPaise?: number; mode?: string } | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [allowBalance, setAllowBalance] = useState(false);
  const [method, setMethod] = useState("cash");
  const [paymentRequestId, setPaymentRequestId] = useState(() => crypto.randomUUID());
  const [manualRequestId, setManualRequestId] = useState(() => crypto.randomUUID());
  const [chargeRequestId, setChargeRequestId] = useState(() => crypto.randomUUID());
  const [discountRequestId, setDiscountRequestId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    const refresh = () => { if (!submitting.current && document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [router]);
  const stay = data.stays?.find(value => value.reservation_id === reservation.id);
  const profile = data.guestProfiles?.find(value => value.reservation_id === reservation.id);
  const folio = data.folios?.find(value => value.reservation_id === reservation.id);
  const items = data.folioItems?.filter(value => value.reservation_id === reservation.id) || [];
  const payments = data.folioPayments?.filter(value => value.reservation_id === reservation.id) || [];
  const invoice = data.invoices?.find(value => value.reservation_id === reservation.id);
  const reviews = data.balanceRequests?.filter(value => value.reservation_id === reservation.id && value.review_reason) || [];
  const assigned = data.assignments.filter(value => value.reservation_id === reservation.id).map(value => value.room_number);
  const balance = folio?.balance_paise ?? Math.max(0, reservation.total_paise - reservation.paid_paise);
  const credit = folio?.credit_paise ?? Math.max(0, (folio?.paid_paise ?? reservation.paid_paise) - (folio?.total_paise ?? reservation.total_paise));
  const taxPaise = folio ? folio.tax_paise : reservation.tax_paise;
  const core = Boolean(data.staffCoreReady);
  const foreign = stay?.nationality && !["indian", "india", "in"].includes(stay.nationality.trim().toLowerCase());
  async function save(input: Record<string, unknown>, text = "Saved.", endpoint = "/api/staff/operations") {
    if (submitting.current) return false;
    submitting.current = true; setPending(true); setNotice({ text: "", error: false });
    try { await request(endpoint, input); setNotice({ text, error: false }); router.refresh(); return true; }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not save this change.", error: true }); return false; }
    finally { submitting.current = false; setPending(false); }
  }
  async function providerPayment(kind: "link" | "qr") {
    if (submitting.current) return;
    submitting.current = true; setPending(true); setNotice({ text: "", error: false });
    try {
      const result = await request<{ data: { url?: string; imageUrl?: string; amountPaise?: number; mode?: string } }>("/api/staff/payments", { reservationId: reservation.id, kind, requestId: paymentRequestId });
      setPayment(result.data); setPaymentRequestId(crypto.randomUUID());
      setNotice({ text: "Payment request created. Keep this page open; the verified payment will appear after refresh.", error: false });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not create a payment request.", error: true }); }
    finally { submitting.current = false; setPending(false); }
  }
  async function checkOut(reason?: string) {
    if (submitting.current) return;
    submitting.current = true; setPending(true); setNotice({ text: "", error: false });
    try {
      const input: Record<string, unknown> = { action: "check_out", reservationId: reservation.id };
      if (reason) { input.allowBalanceDue = true; input.reason = reason; }
      const result = await request<{ data: { invoiceId?: string } }>("/api/staff/operations", input);
      router.push(`/staff/invoices/${result.data.invoiceId || reservation.id}`); router.refresh();
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Check-out and the invoice could not be saved.", error: true }); }
    finally { submitting.current = false; setPending(false); }
  }
  async function invoiceAction(operation: "create" | "share" | "revoke" | "email") {
    if (submitting.current) return;
    submitting.current = true; setPending(true); setNotice({ text: "", error: false });
    try {
      const result = await request<{ data: { url?: string } }>("/api/staff/invoices", { reservationId: reservation.id, operation });
      if (operation === "share" && result.data.url) setInvoiceUrl(result.data.url);
      if (operation === "revoke") setInvoiceUrl("");
      setNotice({ text: operation === "email" ? "Invoice email sent." : operation === "revoke" ? "Shared invoice access revoked." : operation === "share" ? "Invoice share link is ready." : "Invoice created.", error: false }); router.refresh();
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not prepare the invoice.", error: true }); }
    finally { submitting.current = false; setPending(false); }
  }
  function charge(event: FormEvent<HTMLFormElement>, kind: "charge" | "discount") {
    event.preventDefault(); const form = event.currentTarget, fields = new FormData(form);
    void save({ action: kind, reservationId: reservation.id, requestId: kind === "charge" ? chargeRequestId : discountRequestId, description: fields.get("description"), amountPaise: Math.round(Number(fields.get("amount")) * 100) }, kind === "charge" ? "Charge added." : "Discount added.").then(ok => { if (ok) { form.reset(); if (kind === "charge") setChargeRequestId(crypto.randomUUID()); else setDiscountRequestId(crypto.randomUUID()); } });
  }
  if (panel === "check_in") return <StaffCheckIn key={reservation.id} reservation={reservation} data={data} onBack={() => setPanel("details")} onComplete={() => { setPanel("details"); setNotice({ text: "Guest checked in.", error: false }); router.refresh(); }} />;
  return <div className="staff-stay">
    {embedded && panel === "details" ? <div className="staff-embedded-guest"><h3>{reservation.full_name}</h3><p>{reservation.reference}</p></div> : <StaffHeading title={panel === "food" ? "Food bill" : panel === "payment" ? "Take payment" : reservation.full_name} back={() => panel === "payment" || panel === "food" ? setPanel("details") : (onBack || (() => router.replace("/staff/operations")))()}><p>{reservation.reference} · Room {assigned.join(", ") || "not assigned"}</p></StaffHeading>}
    <StaffNotice error={notice.error}>{notice.text}</StaffNotice>
    {reservation.payment_review_reason && <StaffNotice error>Payment review: {reservation.payment_review_reason}. Resolve this with Razorpay before recording any further payment.</StaffNotice>}
    {credit > 0 && <StaffNotice error>Credit / refund review: {formatInr(credit)} received above the saved bill. Review the payment records and handle any approved refund with the payment provider.</StaffNotice>}
    {reviews.map(value => <StaffNotice error key={value.id}>Payment review: {value.review_reason} · {formatInr(value.amount_paise)}. Resolve this with Razorpay before clearing the guest’s balance.</StaffNotice>)}
    <div className="staff-stay-summary staff-card"><StaffStatus value={reservation.status} /><p>{reservation.guests} guests · Room {assigned.join(", ") || "not assigned"}</p><dl className="staff-stay-facts"><div><dt>Arrival date</dt><dd>{formatHotelDate(reservation.check_in)}</dd></div><div><dt>Checked in</dt><dd>{staffTimestamp(stay?.checked_in_at)}</dd></div><div><dt>Booked through</dt><dd>{stay?.source === "other" ? stay.source_other || "Other" : sourceLabels[stay?.source || "direct_website"] || stay?.source}</dd></div>{stay?.ota_reference && <div><dt>Booking reference</dt><dd>{stay.ota_reference}</dd></div>}<div><dt>Expected check-out</dt><dd>{formatHotelDate(stay?.expected_check_out || reservation.check_out)}</dd></div>{stay?.checked_out_at && <div><dt>Checked out</dt><dd>{staffTimestamp(stay.checked_out_at)}</dd></div>}</dl><a className="staff-contact" href={`tel:${reservation.phone}`}><Phone size={18} aria-hidden="true" /> {reservation.phone}</a></div>
    {foreign && <StaffNotice>Foreign guest: file Form III (formerly Form C) through FRRO within 24 hours of arrival. Report departure within 24 hours too. <a href="https://www.indianfrro.gov.in/frro/FormC/login.jsp" target="_blank" rel="noreferrer">Open FRRO</a></StaffNotice>}
    {!core && <StaffNotice>The staff update is being prepared. Existing bookings remain saved; new folio and check-in controls open after the update.</StaffNotice>}
    {panel === "details" && core && !invoice && reservation.status === "checked_in" && <div className="staff-room-quick-actions"><button type="button" onClick={() => setPanel("food")}><Utensils size={20} aria-hidden="true" /> Add food bill</button></div>}
    <section className="staff-folio staff-card"><h3>Stay bill</h3><dl>
      <div><dt>Room nights</dt><dd>{formatInr(folio?.room_subtotal_paise ?? reservation.subtotal_paise)}</dd></div>
      {items.map(item => <div key={item.id}><dt>{item.description}{item.kind === "discount" ? " (discount)" : ""}</dt><dd>{item.kind === "discount" ? "−" : ""}{formatInr(item.amount_paise)}</dd></div>)}
      <div><dt>Taxable value</dt><dd>{formatInr(folio?.taxable_paise ?? reservation.subtotal_paise)}</dd></div>
      <div><dt>GST {folio?.tax_rate_bps !== null && folio?.tax_rate_bps !== undefined ? `(${folio.tax_rate_bps / 100}%)` : ""}</dt><dd>{taxPaise === null ? "Awaiting approval" : formatInr(taxPaise)}</dd></div>
      <div className="staff-folio-total"><dt>Total</dt><dd>{formatInr(folio?.total_paise ?? reservation.total_paise)}{reservation.tax_paise === null && !folio?.tax_confirmed ? " + tax pending" : ""}</dd></div>
      <div><dt>Received</dt><dd>{formatInr(folio?.paid_paise ?? reservation.paid_paise)}</dd></div><div className="staff-balance"><dt>Balance due</dt><dd>{formatInr(balance)}</dd></div>{credit > 0 && <div><dt>Credit / refund review</dt><dd>{formatInr(credit)}</dd></div>}
    </dl>{!folio?.tax_confirmed && <p className="staff-help">The owner must confirm tax treatment. Final invoices and online payments require approved tax settings.</p>}</section>
    {panel === "food" ? <form className="staff-form staff-card" onSubmit={event => { event.preventDefault(); const form = event.currentTarget, fields = new FormData(form), details = String(fields.get("description") || "").trim(); void save({ action: "charge", reservationId: reservation.id, requestId: chargeRequestId, description: details ? `Food bill · ${details}` : "Food bill", amountPaise: Math.round(Number(fields.get("amount")) * 100) }, "Food bill added to this stay.").then(ok => { if (ok) { setChargeRequestId(crypto.randomUUID()); setPanel("details"); } }); }}><h3>Add food bill</h3><label>Food details (optional)<input name="description" maxLength={188} placeholder="Dinner, tea, breakfast…" /></label><label>Food bill amount (₹)<input name="amount" type="number" min="0.01" max={1000000} step="0.01" inputMode="decimal" required /></label><p className="staff-help">This charge is added to the stay total and the final invoice.</p><div className="staff-sticky-action"><button className="staff-primary" disabled={pending}>{pending ? "Saving food bill…" : "Add food bill"}</button></div></form> : panel === "payment" ? <div>
      <div className="staff-card"><h3>Online payment</h3><p>Use a Razorpay payment link or QR. A guest showing a success screen does not record money; the verified webhook confirms payment.</p><div className="staff-action-stack"><button type="button" disabled={pending || !core || !data.paymentReady || !folio?.tax_confirmed || balance <= 0} onClick={() => void providerPayment("link")}><CreditCard size={20} aria-hidden="true" /> Create payment link</button><button type="button" disabled={pending || !core || !data.paymentReady || !folio?.tax_confirmed || balance <= 0} onClick={() => void providerPayment("qr")}>Create UPI QR</button></div>{!data.paymentReady && <p className="staff-help">Razorpay setup is required. You can record a payment already received below.</p>}
        {payment && <div className="staff-payment-result">{payment.mode === "test" && <StaffNotice>Test payment request. This does not collect live money.</StaffNotice>}{payment.url && <a className="staff-primary" href={payment.url} target="_blank" rel="noreferrer">Open payment link</a>}{payment.imageUrl && <><Image src={payment.imageUrl} alt="UPI QR for this stay" width={260} height={260} unoptimized /><a href={payment.imageUrl} target="_blank" rel="noreferrer">Open QR</a></>}<p>Waiting for a verified payment. Balance updates when payment is confirmed.</p></div>}
      </div>
      <form className="staff-form staff-card" onSubmit={event => { event.preventDefault(); const form = event.currentTarget, fields = new FormData(form); void save({ action: "manual_payment", reservationId: reservation.id, requestId: manualRequestId, amountPaise: Math.round(Number(fields.get("amount")) * 100), method, reference: String(fields.get("reference") || "").trim() }, "Payment recorded.").then(ok => { if (ok) { setManualRequestId(crypto.randomUUID()); setPanel("details"); } }); }}>
        <h3>Payment already received</h3><label>Amount (₹)<input name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" max={balance / 100} defaultValue={balance / 100} required /></label><label>Method<select value={method} onChange={event => setMethod(event.target.value)}><option value="cash">Cash</option><option value="card_terminal">Card on hotel machine</option><option value="upi_manual">UPI to hotel account</option></select></label>{method !== "cash" && <label>Payment reference<input name="reference" required maxLength={120} autoComplete="off" /></label>}
        <p className="staff-help">Record only money received by the hotel. Your staff account and the time are saved with this payment.</p><button className="staff-primary" disabled={pending || !core || balance <= 0}>{pending ? "Saving payment…" : "Record payment"}</button>
      </form>
    </div> : <>
      <div className="staff-main-action">{reservation.status === "confirmed" ? <button type="button" className="staff-primary" disabled={pending || !core} onClick={() => setPanel("check_in")}>Check in</button> : ["checked_in", "checked_out", "confirmed"].includes(reservation.status) && balance > 0 ? <button type="button" className="staff-primary" disabled={pending || !core} onClick={() => setPanel("payment")}>Take payment · {formatInr(balance)}</button> : reservation.status === "checked_in" ? <button type="button" className="staff-primary" disabled={pending || !core} onClick={() => void checkOut()}>{pending ? "Creating invoice…" : "Check out & create invoice"}</button> : null}</div>
      {reservation.status === "checked_in" && balance > 0 && <div className="staff-card"><p>Settle the balance before checking out.</p>{data.role === "manager" && <details><summary>Manager: allow balance due</summary><form className="staff-form" onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); void checkOut(String(fields.get("reason") || "").trim()); }}><label className="staff-checkbox"><input type="checkbox" checked={allowBalance} onChange={event => setAllowBalance(event.target.checked)} required /> I approve the outstanding balance</label><label>Reason<textarea name="reason" required minLength={5} maxLength={500} /></label><button type="submit" className="staff-danger" disabled={pending || !core || !allowBalance}>Approve, check out &amp; create invoice</button></form></details>}</div>}
      {core && !invoice && ["confirmed", "checked_in"].includes(reservation.status) && <details className="staff-card"><summary><Plus size={18} aria-hidden="true" /> Add extra charge</summary><form className="staff-form" onSubmit={event => charge(event, "charge")}><label>Description<input name="description" required minLength={2} maxLength={200} placeholder="Food, laundry, extra bed…" /></label><label>Amount (₹)<input name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" required /></label><button className="staff-primary" disabled={pending}>Add charge</button></form></details>}
      {core && !invoice && data.role === "manager" && ["confirmed", "checked_in"].includes(reservation.status) && <details className="staff-card"><summary>Manager discount</summary><form className="staff-form" onSubmit={event => charge(event, "discount")}><label>Reason<input name="description" required minLength={2} maxLength={200} /></label><label>Discount (₹)<input name="amount" type="number" inputMode="decimal" min="0.01" max={(folio?.taxable_paise || 0) / 100} step="0.01" required /></label><button className="staff-primary" disabled={pending}>Add discount</button></form></details>}
      {core && !invoice && ["confirmed", "checked_in"].includes(reservation.status) && <details className="staff-card"><summary>Change check-out date</summary><form className="staff-form" onSubmit={event => { event.preventDefault(); void save({ action: "extend", reservationId: reservation.id, checkOut: new FormData(event.currentTarget).get("checkOut") }, "Expected check-out updated after checking availability."); }}><label>Expected check-out<input name="checkOut" type="date" min={hotelToday()} defaultValue={stay?.expected_check_out || reservation.check_out} required /></label><p className="staff-help">Availability and the bill are checked again before saving.</p><button className="staff-primary" disabled={pending}>Save check-out date</button></form></details>}
      <details className="staff-card"><summary>Guest profile &amp; ID</summary><dl className="staff-guest-details"><div><dt>Phone</dt><dd>{profile?.phone || reservation.phone}</dd></div><div><dt>Email</dt><dd>{profile?.email || reservation.email || "Not supplied"}</dd></div><div><dt>Address</dt><dd>{profile?.address || stay?.address || "Not recorded"}</dd></div><div><dt>Nationality</dt><dd>{profile?.nationality || stay?.nationality || "Not recorded"}</dd></div><div><dt>Guest count</dt><dd>{`${profile?.adults ?? stay?.adults ?? reservation.guests} adults · ${profile?.children ?? stay?.children ?? 0} children`}</dd></div><div><dt>ID</dt><dd>{(profile?.id_type || stay?.id_type)?.replaceAll("_", " ") || "Not recorded"} {profile?.id_number || stay?.id_number || ""}</dd></div>{stay?.ota_reference && <div><dt>OTA reference</dt><dd>{stay.ota_reference}</dd></div>}</dl></details>
      {core && data.role === "manager" && stay?.checked_in_at && <details className="staff-card"><summary>Manager: correct check-in time</summary><form className="staff-form" onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); void save({ action: "checkin_correction", reservationId: reservation.id, checkedInAt: `${fields.get("checkedInAt")}:00+05:30`, reason: String(fields.get("reason") || "").trim() }, "Check-in time corrected with an audit entry."); }}><label>Correct check-in date &amp; time (IST)<input name="checkedInAt" type="datetime-local" required /></label><label>Reason<textarea name="reason" required minLength={5} maxLength={500} /></label><p className="staff-help">The previous time, your staff account and this reason are recorded in the audit.</p><button className="staff-primary" disabled={pending}>Save corrected check-in time</button></form></details>}
      {payments.length > 0 && <details className="staff-card"><summary>Payments received ({payments.length})</summary>{payments.map(value => <div className="staff-payment-entry" key={value.id}><strong>{formatInr(value.amount_paise)} · {value.method.replaceAll("_", " ")}</strong><p>{value.reference || "No reference"} · {staffTimestamp(value.received_at)}</p><p>Received by {data.staffMembers?.find(member => member.user_id === value.received_by)?.name || (value.method === "razorpay" ? "verified Razorpay webhook" : "recorded staff account")}</p></div>)}</details>}
      <details className="staff-card"><summary><ReceiptText size={20} aria-hidden="true" /> Invoice</summary>{invoice ? <><p>{invoice.number} · {staffTimestamp(invoice.issued_at)}</p><Link className="staff-primary" href={`/staff/invoices/${invoice.id}`}>Open printable invoice</Link><p className="staff-help">A shared invoice link is readable by anyone who has it. Share only with the guest.</p><div className="staff-action-stack"><button disabled={pending || !core} onClick={() => void invoiceAction("share")}>Prepare WhatsApp share link</button>{data.emailReady && reservation.email && <button disabled={pending || !core} onClick={() => void invoiceAction("email")}>Email invoice to guest</button>}{invoice.share_enabled && <button disabled={pending || !core} onClick={() => void invoiceAction("revoke")}>Revoke shared link</button>}</div>{invoiceUrl && <a className="staff-primary" href={`https://wa.me/${reservation.phone.replaceAll(/\D/g, "")}?text=${encodeURIComponent(`Your Mainali Hospitality invoice: ${invoiceUrl}`)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>}</> : <><p>The Mainali invoice is created when the guest checks out. Room nights, food bills and other charges are included using the hotel’s approved details and tax settings.</p>{reservation.status === "checked_out" && <button disabled={pending || !core || !folio?.tax_confirmed} onClick={() => void invoiceAction("create")}>Create invoice</button>}</>}</details>
      {reservation.status === "tentative" && <button type="button" disabled={pending} onClick={() => void save({ action: "confirm", reservationId: reservation.id }, "Reservation confirmed after guest follow-up.")}>Confirm after guest follow-up</button>}
      {["tentative", "payment_pending", "confirmed"].includes(reservation.status) && (folio?.paid_paise ?? reservation.paid_paise) === 0 && <details className="staff-card"><summary>Cancel unpaid reservation</summary><p>The room hold is released when this reservation is cancelled.</p><button type="button" className="staff-danger" disabled={pending} onClick={() => void save({ action: "cancel", reservationId: reservation.id }, "Unpaid reservation cancelled.")}>Cancel this reservation</button></details>}
      {reservation.status === "payment_review" && <StaffNotice error>Captured payment needs a provider review or refund. This booking is not confirmed.</StaffNotice>}
    </>}
  </div>;
}
