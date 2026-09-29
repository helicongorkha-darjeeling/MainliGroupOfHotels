import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, Phone, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "My bookings" };

export default function MyBookingsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="account-page site-shell">
        <div className="account-copy">
          <p className="eyebrow">Guest access</p>
          <h1>Your bookings,<br />one phone number.</h1>
          <p>Phone OTP access will appear here after Supabase and an approved SMS provider are connected. No password or separate signup will be required.</p>
          <div className="account-points">
            <span><Phone /> Enter a phone number with country code</span>
            <span><KeyRound /> Verify the one-time code</span>
            <span><ShieldCheck /> See only your own reservation records</span>
          </div>
          <div className="preview-alert"><ShieldCheck size={20} /><div><strong>Secure login is not simulated.</strong><p>The OTP control stays disabled until a real provider and abuse protection are configured.</p></div></div>
          <button className="button button-disabled" disabled>Continue with phone</button>
          <Link href="/" className="text-link">Return home</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
