import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { AdminPasswordForm } from "@/components/admin-password-form";
import { readStaffAccess, adminLoginEmail } from "@/lib/server/staff-access";
import { readPublicSupabaseEnvironment } from "@/lib/server/env";

export const metadata: Metadata = { title: "Admin account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const access = await readStaffAccess();
  if (!access.user || access.errorCode === "PT401") redirect("/admin/login");
  const environment = readPublicSupabaseEnvironment();
  const owner = access.user.email?.toLowerCase() === adminLoginEmail;
  const username = access.data?.role !== "housekeeping" ? access.data?.staffMembers?.find(member => member.user_id === access.user?.id)?.username : null;
  return <main className="site-shell section-space admin-account"><Brand /><p className="eyebrow">Mainali Hospitality · Account</p><h1>Set your password</h1>
    {access.data?.role !== "manager" || !environment.success ? <p role="alert">Manager access is required. Return to the dashboard or sign in with your approved owner account.</p> : <>
      <p>{owner ? "Your login name is Admin." : username ? `Your login name is ${username}.` : "Use the sign-in name assigned in Staff."} This password belongs to your signed-in staff account.</p>
      <AdminPasswordForm supabaseUrl={environment.data.NEXT_PUBLIC_SUPABASE_URL} publishableKey={environment.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} />
    </>}
    <Link href="/admin" className="text-link">Return to dashboard</Link>
  </main>;
}
