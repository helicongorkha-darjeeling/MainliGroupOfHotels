"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { CheckoutCaptcha } from "@/components/checkout-captcha";
import { requestMobileOtp, verifyMobileOtp, MobileCheckoutError } from "@/lib/mobile-checkout";

export function MemberLogin({ enabled, captchaSiteKey }: { enabled: boolean; captchaSiteKey: string }) {
  const router = useRouter();
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createBrowserClient(url, key, {global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15_000)})}}) : null;
  }, []);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sentPhone, setSentPhone] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const ready = enabled && !!captchaSiteKey && !!supabase;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !supabase || pending.current) return;
    pending.current = true; setBusy(true); setMessage("");
    try {
      if (!sentPhone) {
        setSentPhone(await requestMobileOtp(supabase.auth, phone, token, ready));
        setMessage("Your SMS code was requested. Enter it below to sign in.");
      } else {
        await verifyMobileOtp(supabase.auth, sentPhone, code, ready);
        router.refresh();
      }
    } catch (error) { setMessage(error instanceof MobileCheckoutError ? error.message : "Sign-in couldn't be completed. Please retry."); }
    finally { pending.current = false; setBusy(false); }
  }

  return <form className="guest-signin-form member-login-form" onSubmit={submit}>
    <label>Mobile number<input type="tel" autoComplete="tel" placeholder="+91…" value={phone} disabled={!ready || busy || !!sentPhone} onChange={(event)=>setPhone(event.target.value)} required /></label>
    {ready && !sentPhone && <CheckoutCaptcha siteKey={captchaSiteKey} onToken={setToken} />}
    {sentPhone && <label>SMS code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={(event)=>setCode(event.target.value.replace(/\D/g,""))} disabled={busy} required /></label>}
    <button type="submit" className="button button-primary" disabled={!ready || busy || (!sentPhone && !token)}>{busy ? "Please wait…" : sentPhone ? "Verify & sign in" : "Continue with mobile"}</button>
    {sentPhone && <button type="button" className="text-link" disabled={busy} onClick={()=>{setSentPhone(null);setCode("");setToken("");setMessage("Check your number and complete a new security check to request another code.");}}>Change number or request another code</button>}
    {!ready && <p className="checkout-setup-notice">Member sign-in is not available yet. Please check back soon.</p>}
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
