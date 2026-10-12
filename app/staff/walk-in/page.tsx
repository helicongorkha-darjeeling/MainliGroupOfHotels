import type { Metadata } from "next";
import { StaffWalkIn } from "@/components/staff-walk-in";
import { StaffShell } from "@/components/staff-shell";
import { staffPageAccess } from "@/lib/server/staff-page";
export const metadata: Metadata = { title: "New walk-in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function WalkInPage() {
 const access = await staffPageAccess(["manager", "reception"]);
 return <StaffShell title="New walk-in" role={access.data?.role}>{access.data && access.data.role !== "housekeeping" ? <StaffWalkIn data={access.data} /> : <p role="alert">{access.error}</p>}</StaffShell>;
}

