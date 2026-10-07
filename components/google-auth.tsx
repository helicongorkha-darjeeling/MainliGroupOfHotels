"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authCallbackUrl } from "@/lib/auth-redirect";

/** Sends the browser to Google; resolves only if the redirect couldn't start. */
export async function startGoogleSignIn(supabase: SupabaseClient, destination: string) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: authCallbackUrl(window.location.origin, destination),
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) throw error ?? new Error("Missing authorization URL");
  window.location.assign(data.url);
}

export function GoogleAuth({ signedIn = false, destination = "/my-bookings", authError = false }: {
  signedIn?: boolean;
  // Must be an allow-listed guest path (see safeAuthDestination); anything else falls back to /my-bookings.
  destination?: string;
  authError?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createBrowserClient(url, key, {
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }) },
    }) : null;
  }, []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(authError ? "Sign-in wasn't completed. Please try again from this browser." : "");
  const pending = useRef(false);

  useEffect(() => {
    // Returning from Google via Back can restore this page with its pre-redirect busy state.
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) { pending.current = false; setBusy(false); }
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function act() {
    if (!supabase || pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (signedIn) {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        // A failed revoke request still clears this browser's session, which is what signing out here means.
        if (error && (await supabase.auth.getSession()).data.session) throw error;
        window.location.assign(destination);
        return;
      }
      await startGoogleSignIn(supabase, destination);
    } catch {
      setMessage(signedIn ? "Couldn't sign out. Please retry." : "Couldn't start Google sign-in. Please retry; if it persists, contact the hotel.");
      pending.current = false;
      setBusy(false);
      if (signedIn) router.refresh();
    }
  }

  return <div className="guest-signin-form member-login-form">
    <button type="button" className={signedIn ? "button button-outline" : "button button-primary"} onClick={act} disabled={!supabase || busy}>
      {busy ? "Please wait…" : signedIn ? "Sign out" : "Continue with Google"}
    </button>
    {!supabase && <p className="checkout-setup-notice">Sign-in is temporarily unavailable. Please contact the hotel.</p>}
    {!signedIn && <p>No password needed. Your Google account signs you in; it does not verify your mobile number.</p>}
    <p role="status" aria-live="polite">{message}</p>
  </div>;
}
