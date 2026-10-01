"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { guestDetailsSchema } from "@/lib/guest-details";

type GuestBookingFlowProps = {
  bookingPath: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  categoryId: string | null;
  bookingEnabled: boolean;
};

type HoldResult = { booking_reference: string; hold_expires_at: string };

export function GuestBookingFlow({ bookingPath, checkIn, checkOut, guests, rooms, categoryId, bookingEnabled }: GuestBookingFlowProps) {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);
  const [authState, setAuthState] = useState<"checking" | "signed_out" | "signed_in">(supabase ? "checking" : "signed_out");
  const [step, setStep] = useState<"details" | "checkout">("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [hold, setHold] = useState<HoldResult | null>(null);
  const checkoutRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const user = data.user;
      setAuthState(user ? "signed_in" : "signed_out");
      if (user) {
        setEmail(user.email ?? "");
        setFullName(typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "");
        setPhone(typeof user.user_metadata.phone_number === "string" ? user.user_metadata.phone_number : "");
      }
    }).catch(() => {
      if (active) {
        setAuthState("signed_out");
        setMessage("Sign-in couldn't be checked. You can still review your stay.");
      }
    });
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    if (step === "checkout") checkoutRef.current?.focus();
  }, [step]);

  function reviewCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = guestDetailsSchema.safeParse({ fullName, email, phone });
    if (!result.success) { setMessage(result.error.issues[0].message); return; }
    setFullName(result.data.fullName);
    setEmail(result.data.email);
    setPhone(result.data.phone);
    setMessage("");
    setStep("checkout");
  }

  async function sendSignInLink() {
    if (!supabase || busy) return;
    const details = guestDetailsSchema.safeParse({ fullName, email, phone });
    if (!details.success) { setMessage(details.error.issues[0].message); return; }
    setBusy(true);
    setMessage("");
    try {
      const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(bookingPath)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: details.data.email,
        options: { emailRedirectTo: callback, data: { full_name: details.data.fullName, phone_number: details.data.phone }, shouldCreateUser: true },
      });
      setMessage(error ? "We couldn't send your sign-in link. Check your email address and try again shortly." : "Sign-in link sent. Open it in this browser to continue. No room has been reserved yet.");
    } catch { setMessage("Unable to reach sign-in. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  async function holdRoom() {
    // Display choices must never fall through to the Double Room inventory.
    if (!supabase || busy || !bookingEnabled || !categoryId || rooms !== 1 || authState !== "signed_in") return;
    const details = guestDetailsSchema.safeParse({ fullName, email, phone });
    if (!details.success) { setMessage(details.error.issues[0].message); return; }
    setBusy(true);
    setMessage("");
    try {
      const profile = await supabase.auth.updateUser({ data: { full_name: details.data.fullName, phone_number: details.data.phone } });
      if (profile.error) { setMessage("Your contact details couldn't be saved. Please try again."); return; }
      const { data, error } = await supabase.rpc("create_online_inventory_hold", {
        property_slug: "hotel-teesta", requested_category_id: categoryId,
        requested_check_in: checkIn, requested_check_out: checkOut,
        requested_adults: guests, requested_children: 0,
      });
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result || typeof result.booking_reference !== "string" || !Number.isFinite(Date.parse(result.hold_expires_at))) {
        setMessage("A room couldn't be reserved for these dates. No payment was taken."); return;
      }
      setHold(result as HoldResult);
    } catch { setMessage("We couldn't check room availability. Please try again before making any payment."); }
    finally { setBusy(false); }
  }

  return (
    <div className="guest-booking-flow">
      <ol className="booking-steps" aria-label="Booking steps">
        <li><CheckCircle2 size={15} aria-hidden="true" /> Room</li>
        <li aria-current={step === "details" ? "step" : undefined}>2 · Guest details</li>
        <li aria-current={step === "checkout" ? "step" : undefined}>3 · Checkout</li>
      </ol>
      {authState === "checking" ? <p className="booking-flow-status"><LoaderCircle className="spin" size={18} /> Checking secure sign-in…</p> : step === "details" ? (
        <form className="guest-signin-form" onSubmit={reviewCheckout}>
          <h2>Who is booking?</h2>
          <label>Full name<input name="fullName" autoComplete="name" value={fullName} maxLength={120} onChange={(event) => setFullName(event.target.value)} required /></label>
          <label>Phone number<input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} required /></label>
          <label>Email address<input name="email" type="email" autoComplete="email" value={email} readOnly={authState === "signed_in"} maxLength={254} onChange={(event) => setEmail(event.target.value)} required /></label>
          <p>Your contact details are used for this booking. Your phone number is not used for sign-in verification.</p>
          <button className="button button-primary" type="submit">Review checkout <ArrowRight size={17} aria-hidden="true" /></button>
          <p role="status" aria-live="polite">{message}</p>
        </form>
      ) : (
        <section className="checkout-review" aria-labelledby="checkout-review-title">
          <h2 id="checkout-review-title" ref={checkoutRef} tabIndex={-1}>Review checkout.</h2>
          <dl className="checkout-contact"><div><dt>Guest</dt><dd>{fullName}</dd></div><div><dt>Phone</dt><dd>{phone}</dd></div><div><dt>Email</dt><dd>{email}</dd></div></dl>
          <button className="text-link checkout-edit" type="button" disabled={busy || !!hold} onClick={() => { setStep("details"); setMessage(""); }}><ArrowLeft size={15} /> Edit contact details</button>
          {authState === "signed_out" ? (
            <div className="checkout-verification"><h3><ShieldCheck size={18} /> Verify your email</h3><p>Open the secure link sent to your email before we check availability. Reviewing checkout alone does not reserve a room.</p><button className="button button-primary" type="button" onClick={sendSignInLink} disabled={busy || !supabase}>{busy ? <LoaderCircle className="spin" size={17} /> : <Mail size={17} />} Send secure sign-in link</button>{!supabase && <p>Email verification is temporarily unavailable.</p>}</div>
          ) : <p className="checkout-verified"><CheckCircle2 size={17} /> Email verified</p>}
          {hold ? <div className="booking-hold-success"><CheckCircle2 /><div><strong>Room held · {hold.booking_reference}</strong><span>Held until {new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(hold.hold_expires_at))} in Darjeeling. This is not a confirmed booking.</span></div></div> : authState === "signed_in" && bookingEnabled && categoryId && rooms === 1 ? <button className="button button-primary" type="button" onClick={holdRoom} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />} Check availability &amp; hold room</button> : null}
          <div className="checkout-payment"><h3><CreditCard size={18} /> Payment</h3><p>{!categoryId ? "The hotel must confirm this room's rate and availability before payment." : "Payment opens after email verification, room availability and your final total are confirmed."}</p><button className="button button-outline" type="button" disabled>Payment not open yet</button><small>Your booking is not confirmed. No payment has been taken.</small></div>
          <p className="checkout-message" role="status" aria-live="polite">{message}</p>
        </section>
      )}
    </div>
  );
}
