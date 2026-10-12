import type { Metadata } from "next";
import { StaffHousekeeping } from "@/components/staff-housekeeping";
import { StaffShell } from "@/components/staff-shell";
import { staffPageAccess } from "@/lib/server/staff-page";
export const metadata: Metadata = { title: "Housekeeping", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function HousekeepingPage() {
  const access = await staffPageAccess(["housekeeping"]);
  return <StaffShell title="Housekeeping" role="housekeeping">{access.data?.role === "housekeeping" ? <StaffHousekeeping data={access.data} /> : <p role="alert">{access.error}</p>}</StaffShell>;
}
