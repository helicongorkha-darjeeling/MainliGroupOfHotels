import type { Metadata } from "next";
import { HotelOperations } from "@/components/hotel-operations";
import { StaffShell } from "@/components/staff-shell";
import { staffPageAccess } from "@/lib/server/staff-page";
export const metadata: Metadata = { title: "Front desk", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function OperationsPage() {
  const access = await staffPageAccess(["manager", "reception"]);
  return <StaffShell title="Front desk" role={access.data?.role}>
    {access.error ? <p role="alert">{access.error}</p> : access.data && access.data.role !== "housekeeping" ? <HotelOperations data={access.data} /> : null}
  </StaffShell>;
}
