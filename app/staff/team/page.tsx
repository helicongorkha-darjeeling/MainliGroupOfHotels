import type { Metadata } from "next";
import { StaffAccounts } from "@/components/staff-accounts";
import { StaffShell } from "@/components/staff-shell";
import { staffPageAccess } from "@/lib/server/staff-page";
export const metadata: Metadata = { title: "Staff", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function StaffTeamPage() {
  const access = await staffPageAccess(["manager"]);
  return <StaffShell title="Staff" role="manager">{access.data?.role === "manager" ? <StaffAccounts data={access.data} /> : <p role="alert">{access.error}</p>}</StaffShell>;
}
