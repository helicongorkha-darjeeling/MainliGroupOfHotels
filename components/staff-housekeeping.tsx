"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, BedDouble } from "lucide-react";
import { categoryLabels } from "@/lib/reservations";
import type { StaffHousekeepingData } from "@/lib/staff-types";
import { StaffStatus } from "./staff-ui";

export function StaffHousekeeping({ data }: { data: StaffHousekeepingData }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"dirty" | "all">("dirty");
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [router]);
  const dirty = data.rooms.filter(room => room.housekeeping === "dirty").length;
  const priority = (room: StaffHousekeepingData["rooms"][number]) => room.housekeeping === "dirty" ? 0 : room.occupancy === "departing_today" ? 1 : room.housekeeping === "clean" ? 2 : room.housekeeping === "out_of_service" ? 4 : 3;
  const rooms = data.rooms.filter(room => filter === "all" || room.housekeeping === "dirty").sort((a, b) => priority(a) - priority(b) || a.number.localeCompare(b.number));
  return <div className="staff-app staff-housekeeping">
    <div className="staff-title-row"><div><p className="staff-kicker">Housekeeping · Hotel Teesta</p><h2>Rooms to clean</h2></div><BedDouble size={28} aria-hidden="true" /></div>
    <p className="staff-lead">Bring the key to the front desk when a room is ready. Reception records the clean room.</p>
    <div className="staff-refresh-row"><span>Updates every 30 seconds</span><button type="button" onClick={() => router.refresh()}><RefreshCw size={18} aria-hidden="true" /> Refresh</button></div>
    <nav className="staff-filter-tabs" aria-label="Cleaning filter"><button type="button" aria-pressed={filter === "dirty"} onClick={() => setFilter("dirty")}>Dirty <span>{dirty}</span></button><button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All <span>{data.rooms.length}</span></button></nav>
    {rooms.length === 0 ? <div className="staff-empty"><h2>No dirty rooms</h2><p>Check All to see the other rooms.</p></div> : <div className="staff-cleaning-list">{rooms.map(room => <article key={room.number} className={`staff-cleaning-room staff-room-${room.housekeeping}`}>
      <div><h2>Room {room.number}</h2><p>{categoryLabels[room.category] || room.category}</p></div>
      <div className="staff-room-chips"><StaffStatus value={room.housekeeping} /><StaffStatus value={room.occupancy || "vacant"} /></div>
    </article>)}</div>}
  </div>;
}
