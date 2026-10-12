"use client";

import { ArrowLeft, AlertCircle } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";

export type StaffRequest = <T>(endpoint: string, input?: Record<string, unknown>) => Promise<T>;
const StaffRequestContext = createContext<StaffRequest | null>(null);
export function StaffRequestProvider({ request, children }: { request: StaffRequest; children: ReactNode }) {
  return <StaffRequestContext.Provider value={request}>{children}</StaffRequestContext.Provider>;
}
export function useStaffRequest(): StaffRequest { return useContext(StaffRequestContext) || staffRequest; }

export async function staffRequest<T>(endpoint: string, input?: Record<string, unknown>): Promise<T> {
  const response = await fetch(endpoint, {
    method: input ? "POST" : "GET",
    headers: input ? { "Content-Type": "application/json" } : undefined,
    body: input ? JSON.stringify(input) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  let result: T & { error?: string };
  try { result = await response.json(); }
  catch { throw new Error("The hotel service could not respond. Please refresh and try again."); }
  if (!response.ok) throw new Error(result.error || "This change could not be saved.");
  return result;
}

export function StaffNotice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  if (!children) return null;
  return <div className={`staff-notice${error ? " staff-notice-error" : ""}`} role={error ? "alert" : "status"}>
    {error && <AlertCircle size={20} aria-hidden="true" />}<div className="staff-notice-content">{children}</div>
  </div>;
}

export function StaffHeading({ title, back, children }: { title: string; back: () => void; children?: ReactNode }) {
  return <header className="staff-view-heading">
    <button type="button" className="staff-back" onClick={back}><ArrowLeft size={20} aria-hidden="true" /> Back</button>
    <h2 tabIndex={-1}>{title}</h2>{children}
  </header>;
}

export function staffTimestamp(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date) + " IST";
}

export function StaffStatus({ value }: { value: string }) {
  return <span className={`staff-chip staff-chip-${value.replaceAll(" ", "_").toLowerCase()}`}>{value.replaceAll("_", " ")}</span>;
}
