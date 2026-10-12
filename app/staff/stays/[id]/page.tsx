import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaffStay } from "@/components/staff-stay";
import { StaffShell } from "@/components/staff-shell";
import { staffPageAccess } from "@/lib/server/staff-page";
export const metadata: Metadata = { title: "Guest stay", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function StayPage({params}: {params: Promise<{id:string}>}) {
 const {id} = await params; const access = await staffPageAccess(["manager", "reception"]);
 if (!access.data || access.data.role === "housekeeping") return <StaffShell title="Guest stay"><p role="alert">{access.error}</p></StaffShell>;
 const reservation = access.data.reservations.find(booking => booking.id === id); if (!reservation) notFound();
 return <StaffShell title="Guest stay" role={access.data.role}><StaffStay reservation={reservation} data={access.data}/></StaffShell>;
}

