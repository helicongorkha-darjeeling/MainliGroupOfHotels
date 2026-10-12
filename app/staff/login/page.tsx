import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { StaffLoginForm } from "@/components/staff-login-form";
import { readPublicSupabaseEnvironment } from "@/lib/server/env";
import { adminLoginEmail } from "@/lib/server/staff-access";
import { GoogleAuth } from "@/components/google-auth";

export const metadata: Metadata = { title: "Admin & staff sign in", robots: { index: false, follow: false } };

export default function StaffLoginPage() {
  const environment = readPublicSupabaseEnvironment();

  return (
    <main className="staff-auth-page">
      <div className="staff-auth-brand"><Brand /></div>
      <section className="staff-auth-panel">
        <p className="eyebrow">Private hotel operations</p>
        <h1>Admin &amp; staff sign in</h1>
        <p>Use Admin for the owner account, or your assigned staff email. Access is limited to approved hotel staff.</p>
        {environment.success ? (
          <StaffLoginForm supabaseUrl={environment.data.NEXT_PUBLIC_SUPABASE_URL} publishableKey={environment.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} adminEmail={adminLoginEmail} />
        ) : (
          <div className="staff-setup-note"><strong>Supabase setup required</strong><span>Add the public Supabase URL and publishable key to enable secure staff sign-in.</span></div>
        )}
        <GoogleAuth destination="/admin" description="You can also sign in with your approved staff Google account." />
        <Link href="/admin/security" className="text-link">Set or change your admin password</Link>
        <Link href="/" className="text-link">Return to hotel website</Link>
      </section>
    </main>
  );
}
