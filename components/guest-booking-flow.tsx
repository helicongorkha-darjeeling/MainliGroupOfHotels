"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowRight, CheckCircle2, LoaderCircle, Mail } from "lucide-react";

type GuestBookingFlowProps = {
  bookingPath: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  bookingEnabled: boolean;
};

type HoldResult = {
  booking_reference: string;
  hold_expires_at: string;
};

export function GuestBookingFlow({ bookingPath, checkIn, checkOut, guests, rooms, bookingEnabled }: GuestBookingFlowProps) {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);
  const [authState, setAuthState] = useState<"checking" | "signed_out" | "signed_in">(supabase ? "checking" : "signed_out");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(supabase ? "" : "Booking sign-in still needs its Supabase connection.");
  const [busy, setBusy] = useState(false);
  const [hold, setHold] = useState<HoldResult | null>(null);

  useEffect(() => {
    let active = true;
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setAuthState(data.user ? "signed_in" : "signed_out");
    });
    return () => { active = false; };
  }, [supabase]);

  async function sendSignInLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(bookingPath)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback, data: { full_name: fullName }, shouldCreateUser: true },
    });
    setBusy(false);
    setMessage(error ? error.message : "Secure sign-in link sent. Open it in this browser to continue your booking.");
  }

  async function holdRoom() {
    if (!supabase || rooms !== 1) return;
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.rpc("create_online_inventory_hold", {
      property_slug: "hotel-teesta",
      requested_category_id: "10000000-0000-4000-8000-000000000001",
      requested_check_in: checkIn,
      requested_check_out: checkOut,
      requested_adults: guests,
      requested_children: 0,
    });
    setBusy(false);
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result) {
      setMessage(error?.message ?? "No room was held. The booking database is not ready yet.");
      return;
    }
    setHold(result as HoldResult);
  }

  if (authState === "checking") return <p className="booking-flow-status"><LoaderCircle className="spin" size={18} /> Checking secure sign-in…</p>;

  if (authState === "signed_out") {
    return (
      <form className="guest-signin-form" onSubmit={sendSignInLink}>
        <h2>Who is booking?</h2>
        <label>Full name<input name="fullName" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
        <label>Email address<input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <button className="button button-primary" type="submit" disabled={busy || !supabase}>{busy ? <LoaderCircle className="spin" size={17} /> : <Mail size={17} />} Send secure sign-in link</button>
        <p role="status" aria-live="polite">{message}</p>
      </form>
    );
  }

  if (hold) {
    return <div className="booking-hold-success"><CheckCircle2 /><div><strong>Room held · {hold.booking_reference}</strong><span>Held until {new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(new Date(hold.hold_expires_at))}. Payment is the next step.</span></div></div>;
  }

  if (!bookingEnabled) {
    return <div className="booking-preview-gate"><strong>Secure sign-in is ready.</strong><span>The inventory hold stays locked until the Supabase migration and live-booking approval are complete.</span></div>;
  }

  if (rooms !== 1) {
    return <div className="booking-preview-gate"><strong>Multi-room checkout is next.</strong><span>This party needs {rooms} rooms. No partial hold will be created.</span></div>;
  }

  return (
    <div className="booking-hold-action">
      <button className="button button-primary" type="button" onClick={holdRoom} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />} Hold this room</button>
      <p role="status" aria-live="polite">{message}</p>
    </div>
  );
}
