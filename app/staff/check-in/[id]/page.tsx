import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaffCheckIn } from "@/components/staff-check-in";
import { StaffShell } from "@/components/staff-shell";
import { staffPageAccess } from "@/lib/server/staff-page";
export const metadata: Metadata = { title: "Check in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function CheckInPage({params}: {params: Promise<{id:string}>}) {
 const {id} = await params; const access = await staffPageAccess(["manager", "reception"]);
 if (!access.data || access.data.role === "housekeeping") return <StaffShell title="Check in"><p role="alert">{access.error}</p></StaffShell>;
 const reservation = access.data.reservations.find(booking => booking.id === id); if (!reservation) notFound();
 return <StaffShell title="Check in" role={access.data.role}><StaffCheckIn reservation={reservation} data={access.data}/></StaffShell>;
}

