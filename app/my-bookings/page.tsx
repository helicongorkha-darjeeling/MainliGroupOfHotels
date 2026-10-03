import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { GoogleAuth } from "@/components/google-auth";
import { createSessionSupabaseClient } from "@/lib/server/supabase-session";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "My bookings" };

export default async function MyBookingsPage({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const query = await searchParams;
  const supabase = await createSessionSupabaseClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  return (
    <main>
      <SiteHeader />
      <section className="account-page site-shell">
        <div className="account-copy">
          <p className="eyebrow">Guest access</p>
          <h1>{user ? "You're signed in." : <>Your stays,<br />one account.</>}</h1>
          <p>{user ? `Signed in as ${user.email ?? user.phone ?? "a verified guest"}.` : "Sign in securely with Google to access your Mainali guest account."}</p>
          <div className="account-points">
            <span><KeyRound /> No extra password to remember</span>
            <span><ShieldCheck /> A private account for your stays</span>
          </div>
          {user && <div className="preview-alert"><ShieldCheck size={20} /><div><strong>Booking history is being connected.</strong><p>Account access is ready. Reservations and payments are not enabled by signing in; contact the hotel for existing bookings.</p></div></div>}
          <GoogleAuth signedIn={!!user} authError={query.auth === "failed"} />
          {user && <Link href="/members" className="text-link">My member account</Link>}
          <Link href="/" className="text-link">Return home</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
