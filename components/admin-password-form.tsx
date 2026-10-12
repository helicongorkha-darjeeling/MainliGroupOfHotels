"use client";
import { useState, useRef, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function AdminPasswordForm({ supabaseUrl, publishableKey }: { supabaseUrl: string; publishableKey: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("password") ?? "");
    if (password !== values.get("confirmation")) { setMessage("The passwords do not match."); return; }
    pending.current = true; setBusy(true); setMessage("");
    try {
      const supabase = createBrowserClient(supabaseUrl, publishableKey, {
        global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
      });
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      form.reset();
      setMessage("Password saved. You can now sign in with your login name and this password.");
    } catch {
      setMessage("Password could not be saved. Sign in again with Google and retry. If your account requires verification, complete it in Supabase first.");
    } finally { pending.current = false; setBusy(false); }
  }
  return <form className="staff-login-form" onSubmit={submit}>
    <label htmlFor="admin-new-password">New password</label><input id="admin-new-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} />
    <label htmlFor="admin-confirm-password">Confirm password</label><input id="admin-confirm-password" name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} />
    <p>Use at least 12 characters. Save this password for your own staff account.</p>
    <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"}</button><p role="status" aria-live="polite">{message}</p>
  </form>;
}
