"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";

type StaffLoginFormProps = {
  supabaseUrl: string;
  publishableKey: string;
  adminEmail: string;
};

export function StaffLoginForm({ supabaseUrl, publishableKey, adminEmail }: StaffLoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("Admin");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const supabase = useMemo(() => createBrowserClient(supabaseUrl, publishableKey, {
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
  }), [supabaseUrl, publishableKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setMessage("");

    try {
      const login = identifier.trim();
      const email = login.toLowerCase() === "admin" ? adminEmail : login;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setPassword("");
      router.replace("/admin");
      router.refresh();
    } catch {
      setPassword("");
      setMessage("Sign-in failed. Check your username and password, or use Google to sign in and set your password.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form className="staff-login-form" onSubmit={submit}>
      <label htmlFor="staff-identifier"><UserRound size={17} aria-hidden="true" /> Username or staff email</label>
      <input id="staff-identifier" name="username" type="text" autoComplete="username" autoCapitalize="none" maxLength={254} value={identifier} onChange={(event) => setIdentifier(event.target.value)} disabled={pending} required />
      <label htmlFor="staff-password"><LockKeyhole size={17} aria-hidden="true" /> Password</label>
      <input id="staff-password" name="password" type="password" autoComplete="current-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} required />
      <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in to dashboard"} <ArrowRight size={17} aria-hidden="true" /></button>
      <p role="status" aria-live="polite">{message}</p>
    </form>
  );
}
