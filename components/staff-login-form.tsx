"use client";

import { FormEvent, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowRight, Mail } from "lucide-react";

type StaffLoginFormProps = {
  supabaseUrl: string;
  publishableKey: string;
};

export function StaffLoginForm({ supabaseUrl, publishableKey }: StaffLoginFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const supabase = createBrowserClient(supabaseUrl, publishableKey);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/staff/auth/callback` },
    });

    setPending(false);
    setMessage(error ? "Sign-in link could not be sent. Check the address and try again." : "Check your email for the secure sign-in link.");
  }

  return (
    <form className="staff-login-form" onSubmit={submit}>
      <label htmlFor="staff-email"><Mail size={17} aria-hidden="true" /> Staff email</label>
      <input id="staff-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Sending…" : "Email me a secure link"} <ArrowRight size={17} /></button>
      <p role="status" aria-live="polite">{message}</p>
    </form>
  );
}
