import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { StaffLoginForm } from "@/components/staff-login-form";
import { readPublicSupabaseEnvironment } from "@/lib/server/env";

export const metadata: Metadata = { title: "Staff sign in" };

export default function StaffLoginPage() {
  const environment = readPublicSupabaseEnvironment();

  return (
    <main className="staff-auth-page">
      <div className="staff-auth-brand"><Brand /></div>
      <section className="staff-auth-panel">
        <p className="eyebrow">Private hotel operations</p>
        <h1>Front desk sign in</h1>
        <p>Use the email assigned to your Hotel Teesta staff account. No shared passwords.</p>
        {environment.success ? (
          <StaffLoginForm supabaseUrl={environment.data.NEXT_PUBLIC_SUPABASE_URL} publishableKey={environment.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} />
        ) : (
          <div className="staff-setup-note"><strong>Supabase setup required</strong><span>Add the public Supabase URL and publishable key to enable secure staff sign-in.</span></div>
        )}
        <Link href="/" className="text-link">Return to hotel website</Link>
      </section>
    </main>
  );
}
