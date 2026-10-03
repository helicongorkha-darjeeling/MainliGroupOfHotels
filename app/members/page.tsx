import type { Metadata } from "next";
import Link from "next/link";
import { MemberLogin } from "@/components/member-login";
import { GoogleAuth } from "@/components/google-auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createSessionSupabaseClient } from "@/lib/server/supabase-session";

export const metadata: Metadata = { title: "Members login" };
export default async function MembersPage({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const query = await searchParams;
  const supabase = await createSessionSupabaseClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const records = user && supabase ? await supabase.from("bookings").select("id", {count:"exact",head:true}).eq("guest_id",user.id).eq("status","checked_out") : null;
  // A HEAD count against a table that isn't deployed yet returns a null count rather than an error.
  const stayCount = records && !records.error ? records.count : null;
  return <main><SiteHeader /><section className="section-space site-shell member-page"><div><p className="eyebrow">Your Mainali stays</p><h1>{user ? "Welcome back." : "Every stay, in one place."}</h1><p>{user ? `Signed in as ${user.email ?? user.phone ?? "a verified guest"}.` : "Sign in with Google to access your guest account and plan your next visit."}</p>{user && <div className="member-stay-count"><span>Completed stays</span><strong>{stayCount ?? "Not synced yet"}</strong><p>{stayCount === null ? "Your stay history is not available yet. Please check back soon." : "Your completed stays at Mainali, linked to this account."}</p><Link href="/my-bookings" className="text-link">My bookings</Link></div>}<GoogleAuth signedIn={!!user} destination="/members" authError={query.auth === "failed"} />{!user && process.env.PHONE_OTP_ENABLED === "true" && <MemberLogin enabled captchaSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ""} />}</div><aside className="member-note"><p className="eyebrow">A direct connection</p><h2>From your first visit<br />to your next return.</h2><p>A familiar welcome, your stay history, and a direct connection to the hotel.</p><Link href="/stays/teesta#check-rooms" className="button button-outline">Plan your next stay</Link></aside></section><SiteFooter /></main>;
}
