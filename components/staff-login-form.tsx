"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";

export function StaffLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("Admin");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/staff/sign-in", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier.trim(), password }), signal: AbortSignal.timeout(25000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Sign-in failed.");
      setPassword("");
      router.replace(result.destination === "/staff/housekeeping" ? "/staff/housekeeping" : "/staff/operations");
      router.refresh();
    } catch {
      setPassword("");
      setMessage("Sign-in failed. Check your username and password, or ask your manager.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form className="staff-login-form" onSubmit={submit}>
      <label htmlFor="staff-identifier"><UserRound size={17} aria-hidden="true" /> Staff sign-in name</label>
      <input id="staff-identifier" name="username" type="text" autoComplete="username" autoCapitalize="none" maxLength={254} value={identifier} onChange={(event) => setIdentifier(event.target.value)} disabled={pending} required />
      <label htmlFor="staff-password"><LockKeyhole size={17} aria-hidden="true" /> Password</label>
      <input id="staff-password" name="password" type="password" autoComplete="current-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} required />
      <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in to dashboard"} <ArrowRight size={17} aria-hidden="true" /></button>
      <p role="status" aria-live="polite">{message}</p>
    </form>
  );
}
