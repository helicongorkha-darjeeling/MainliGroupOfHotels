"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, LoaderCircle, Smartphone } from "lucide-react";
import { CheckoutCaptcha } from "@/components/checkout-captcha";
import { GoogleAuth } from "@/components/google-auth";
import { guestDetailsSchema } from "@/lib/guest-details";
import { checkoutDraftIdSchema, type CheckoutDraftInput, type CheckoutDraftReceipt } from "@/lib/checkout-draft";
import { CheckoutSaveError, saveCheckoutDraft } from "@/lib/save-checkout-draft";
import { matchesVerifiedMobile, MobileCheckoutError, requestMobileOtp, verifyMobileOtp } from "@/lib/mobile-checkout";

type GuestBookingFlowProps = {
  bookingPath: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  roomType: CheckoutDraftInput["roomType"];
  phoneOtpEnabled: boolean;
  captchaSiteKey: string;
};

export function GuestBookingFlow({ bookingPath, checkIn, checkOut, guests, roomType, phoneOtpEnabled, captchaSiteKey }: GuestBookingFlowProps) {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createBrowserClient(url, key, {
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }) },
    }) : null;
  }, []);
  const [authState, setAuthState] = useState<"checking" | "signed_out" | "signed_in">(supabase ? "checking" : "signed_out");
  const [step, setStep] = useState<"details" | "checkout" | "otp" | "payment">("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [captchaToken, setCaptchaToken] = useState("");
  const [challengeKey, setChallengeKey] = useState(0);
  const otpReady = !!supabase && phoneOtpEnabled && !!captchaSiteKey;
  // A phone sign-in would replace a Google session with a separate phone-only account.
  const otpMode = authState === "signed_in" ? "link" : "sign_in";
  const countdownRunning = resendSeconds > 0;
  const checkoutRef = useRef<HTMLHeadingElement>(null);
  const detailsRef = useRef<HTMLInputElement>(null);
  const draftIdRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const [draft, setDraft] = useState<CheckoutDraftReceipt | null>(null);
  // Without the server key nothing can be saved, but guests can still walk the steps and see what's next.
  const [checkoutClosed, setCheckoutClosed] = useState(false);
  const canContinue = !!draft || checkoutClosed;

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
        setPhone(user.phone ? `+${user.phone.replace(/^\+/, "")}` : typeof user.user_metadata.phone_number === "string" ? user.user_metadata.phone_number : "");
        if (user.phone && matchesVerifiedMobile(user, `+${user.phone.replace(/^\+/, "")}`)) {
          setVerifiedPhone(`+${user.phone.replace(/^\+/, "")}`);
        }
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
    if (step !== "details") {
      checkoutRef.current?.focus({ preventScroll: true });
      checkoutRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
    else if (draft) detailsRef.current?.focus();
  }, [step, draft]);

  useEffect(() => {
    if (!countdownRunning) return;
    const timer = window.setInterval(() => setResendSeconds((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdownRunning]);

  async function reviewCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || savingRef.current) return;
    const result = guestDetailsSchema.safeParse({ fullName, email, phone });
    if (!result.success) { setMessage(result.error.issues[0].message); return; }
    savingRef.current = true;
    setBusy(true);
    setMessage("Saving your details…");
    try {
      const storageKey = `teesta-checkout-draft:${bookingPath}`;
      if (!draftIdRef.current) {
        let previous: string | null = null;
        try { previous = window.sessionStorage.getItem(storageKey); } catch { /* Session storage may be disabled. */ }
        draftIdRef.current = previous && checkoutDraftIdSchema.safeParse(previous).success ? previous : crypto.randomUUID();
        try { window.sessionStorage.setItem(storageKey, draftIdRef.current); } catch { /* The in-memory ID still protects retries. */ }
      }
      const receipt = await saveCheckoutDraft({
        ...result.data, draftId: draftIdRef.current, checkIn, checkOut, guests,
        roomType,
      });
      setDraft(receipt);
      setCheckoutClosed(false);
      setFullName(result.data.fullName);
      setEmail(result.data.email);
      setPhone(result.data.phone);
      setOtp("");
      setOtpSent(false);
      setCaptchaToken("");
      setMessage("");
      setStep("checkout");
    } catch (error) {
      if (error instanceof CheckoutSaveError && error.restartDraft) {
        draftIdRef.current = null;
        try { window.sessionStorage.removeItem(`teesta-checkout-draft:${bookingPath}`); } catch { /* The next attempt still creates a new ID. */ }
      }
      if (error instanceof CheckoutSaveError && error.checkoutClosed) {
        setDraft(null);
        setCheckoutClosed(true);
        setFullName(result.data.fullName);
        setEmail(result.data.email);
        setPhone(result.data.phone);
        setOtp("");
        setOtpSent(false);
        setCaptchaToken("");
        setMessage("");
        setStep("checkout");
        return;
      }
      setMessage(error instanceof CheckoutSaveError ? error.message : "Your details couldn't be saved. Check your connection and retry. No room has been reserved.");
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }

  async function sendCode() {
    if (!supabase || busy || savingRef.current || !canContinue || resendSeconds > 0) return;
    savingRef.current = true;
    setBusy(true);
    setMessage("");
    try {
      await requestMobileOtp(supabase.auth, phone, captchaToken, otpReady, otpMode);
      setOtpSent(true);
      setOtp("");
      setResendSeconds(60);
      setStep("otp");
      setMessage("SMS code requested. Enter the code when it arrives. No room has been reserved.");
    } catch (error) {
      setMessage(error instanceof MobileCheckoutError ? error.message : "Mobile verification is unavailable. Please retry shortly.");
    } finally {
      // CAPTCHA tokens are single-use; every retry or resend needs a fresh challenge.
      setCaptchaToken("");
      setChallengeKey((current) => current + 1);
      savingRef.current = false;
      setBusy(false);
    }
  }

  function bookNow() {
    if (busy || !canContinue) return;
    setMessage("");
    if (verifiedPhone === phone) { setStep("payment"); return; }
    if (!otpReady) { setStep("otp"); return; }
    void sendCode();
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy || savingRef.current || !otpSent || !canContinue) return;
    savingRef.current = true;
    setBusy(true);
    setMessage("");
    try {
      const confirmedPhone = await verifyMobileOtp(supabase.auth, phone, otp, otpReady, otpMode);
      setVerifiedPhone(confirmedPhone);
      setOtp("");
      setStep("payment");
    } catch (error) {
      setMessage(error instanceof MobileCheckoutError ? error.message : "Your code couldn't be verified. Please retry.");
    } finally { savingRef.current = false; setBusy(false); }
  }

  function editDetails() {
    setStep("details");
    setOtp("");
    setOtpSent(false);
    setCaptchaToken("");
    setMessage("");
  }

  return (
    <div className="guest-booking-flow">
      <ol className="booking-steps" aria-label="Booking steps">
        <li><CheckCircle2 size={15} aria-hidden="true" /> Room</li>
        <li aria-current={step === "details" ? "step" : undefined}>2 · Guest details</li>
        <li aria-current={step === "checkout" || step === "otp" ? "step" : undefined}>3 · Verify mobile</li>
        <li aria-current={step === "payment" ? "step" : undefined}>4 · Payment</li>
      </ol>
      {authState === "checking" ? <p className="booking-flow-status"><LoaderCircle className="spin" size={18} /> Checking secure sign-in…</p> : step === "details" ? (<>
        <form className="guest-signin-form" onSubmit={reviewCheckout}>
          <h2>Who is booking?</h2>
          <label>Full name<input ref={detailsRef} name="fullName" autoComplete="name" value={fullName} maxLength={120} disabled={busy} onChange={(event) => setFullName(event.target.value)} required /></label>
          <label>Phone number<input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" maxLength={30} value={phone} disabled={busy} onChange={(event) => setPhone(event.target.value)} required /></label>
          <label>Email address<input name="email" type="email" autoComplete="email" value={email} disabled={busy} maxLength={254} onChange={(event) => setEmail(event.target.value)} required /></label>
          <p>Continuing saves your contact details and selected stay for this checkout. No room is reserved and no payment is taken. <Link href="/policies/privacy">Privacy</Link></p>
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? <>Please wait… <LoaderCircle className="spin" size={17} /></> : <>Checkout <ArrowRight size={17} aria-hidden="true" /></>}</button>
          <p role="status" aria-live="polite">{message}</p>
        </form>
        {authState === "signed_out" && supabase && <div className="booking-google-option">
          <p>Have a Mainali guest account? Sign in with Google to fill in your details; you&apos;ll return to this stay.</p>
          <GoogleAuth destination={bookingPath} />
        </div>}
      </>) : (
        <section className="checkout-review" aria-labelledby="checkout-review-title">
          <h2 id="checkout-review-title" ref={checkoutRef} tabIndex={-1}>{step === "otp" ? "Verify your mobile." : step === "payment" ? "Payment." : "Review checkout."}</h2>
          {draft && <p className="checkout-verified"><CheckCircle2 size={17} /> Details saved · checkout draft {draft.draftId.slice(0, 8)}. No room reserved.</p>}
          {checkoutClosed && <p className="checkout-setup-notice">Online booking isn&apos;t open yet, so your details stay on this device only. No room has been reserved; <Link href="/contact">contact the hotel</Link> to book this stay.</p>}
          {step === "checkout" && <dl className="checkout-contact"><div><dt>Guest</dt><dd>{fullName}</dd></div><div><dt>Phone</dt><dd>{phone}</dd></div><div><dt>Email</dt><dd>{email}</dd></div></dl>}
          <button className="text-link checkout-edit" type="button" disabled={busy} onClick={editDetails}><ArrowLeft size={15} /> Edit contact details</button>
          {step === "checkout" && <div className="checkout-verification">
            <h3><Smartphone size={18} /> Continue with your mobile</h3>
            <p>{verifiedPhone === phone ? "Your mobile is already verified for this signed-in session." : "Book now continues to mobile verification, then payment. It does not confirm or charge your booking."}</p>
            {otpReady && verifiedPhone !== phone && <CheckoutCaptcha key={challengeKey} siteKey={captchaSiteKey} onToken={setCaptchaToken} />}
            <button className="button button-primary" type="button" onClick={bookNow} disabled={busy || !canContinue || (otpReady && verifiedPhone !== phone && (!captchaToken || resendSeconds > 0))}>
              {busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />} Book now
            </button>
            {resendSeconds > 0 && <p>Another code can be requested in {resendSeconds}s.</p>}
          </div>}
          {step === "otp" && <div className="checkout-verification">
            <h3><Smartphone size={18} /> SMS verification · {phone}</h3>
            {!otpReady && <p className="checkout-setup-notice">Mobile verification is not available yet. No SMS has been requested and no room is reserved.</p>}
            <form className="checkout-otp-form" onSubmit={verifyCode}>
              <label htmlFor="checkout-otp">Six-digit code</label>
              <input id="checkout-otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} disabled={!otpReady || !otpSent || busy} required aria-describedby="checkout-otp-hint" />
              <p id="checkout-otp-hint">{otpSent ? "Enter the code from your SMS. Never share it with anyone." : "Request a code before continuing to payment."}</p>
              <button className="button button-primary" type="submit" disabled={busy || !otpReady || !otpSent || !/^\d{6}$/.test(otp)}>{busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />} Verify &amp; continue to payment</button>
            </form>
            {otpReady && <CheckoutCaptcha key={challengeKey} siteKey={captchaSiteKey} onToken={setCaptchaToken} />}
            <button className="text-link checkout-resend" type="button" onClick={sendCode} disabled={busy || !otpReady || !captchaToken || resendSeconds > 0}>{resendSeconds > 0 ? `Request another code in ${resendSeconds}s` : otpSent ? "Resend OTP" : "Send OTP"}</button>
            <button className="text-link checkout-edit" type="button" disabled={busy} onClick={() => { setStep("checkout"); setCaptchaToken(""); setChallengeKey((current) => current + 1); setMessage(""); }}><ArrowLeft size={15} /> Back to review</button>
          </div>}
          {step === "payment" && verifiedPhone === phone && <div className="checkout-payment">
            <h3><CheckCircle2 size={18} /> Mobile verified</h3>
            <p>Your mobile is verified. A room has not been reserved yet.</p>
            <h3><CreditCard size={18} /> Pay securely</h3>
            <p>Payment is not available yet. We must confirm room availability and your final total before opening secure checkout.</p>
            {/* Integration point: request a server-priced order backed by a real category hold.
                Never unlock this button using client state or Razorpay keys alone. */}
            <button className="button button-outline" type="button" disabled>Payment not open yet</button>
            <small>Your booking is not confirmed. No payment has been taken. Reception will assign your room number after a confirmed booking.</small>
          </div>}
          {step !== "payment" && <p className="checkout-next-step"><CreditCard size={16} /> Payment follows mobile verification and an availability check.</p>}
          <p className="checkout-message" role="status" aria-live="polite">{message}</p>
        </section>
      )}
    </div>
  );
}
