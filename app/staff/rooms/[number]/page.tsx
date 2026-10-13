import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaffRoomDashboard } from "@/components/staff-room-dashboard";
import { StaffShell } from "@/components/staff-shell";
import { staffPageAccess } from "@/lib/server/staff-page";

export const metadata: Metadata = { title: "Room dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function StaffRoomPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const access = await staffPageAccess(["manager", "reception"]);
  if (!access.data || access.data.role === "housekeeping") {
    return <StaffShell title="Room dashboard"><p role="alert">{access.error}</p></StaffShell>;
  }
  if (!access.data.rooms.some(room => room.number === number)) notFound();
  return <StaffShell title={`Room ${number}`} role={access.data.role}>
    <StaffRoomDashboard data={access.data} roomNumber={number} />
  </StaffShell>;
}
