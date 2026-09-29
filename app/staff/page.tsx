import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BedDouble, CalendarCheck2, LogOut, Sparkles, UsersRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { createSessionSupabaseClient } from "@/lib/server/supabase-session";
import { signOutStaff, updateHousekeeping } from "@/app/staff/actions";

export const metadata: Metadata = { title: "Front desk" };

type HousekeepingStatus = "unknown" | "clean" | "dirty" | "inspecting" | "out_of_service";

function hotelDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function readableDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(new Date(`${date}T12:00:00+05:30`));
}

export default async function StaffPage() {
  const supabase = await createSessionSupabaseClient();
  if (!supabase) {
    return (
      <main className="staff-setup-page">
        <Brand />
        <p className="eyebrow">Front desk setup</p>
        <h1>Connect Supabase to open hotel operations.</h1>
        <p>The protected room board is ready. Add the Supabase environment values, apply the migration, and assign a staff membership to activate it.</p>
      </main>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/staff/login");

  const { data: memberships } = await supabase
    .from("staff_memberships")
    .select("property_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);
  const membership = memberships?.[0];

  if (!membership) {
    return (
      <main className="staff-setup-page">
        <Brand />
        <p className="eyebrow">Access not assigned</p>
        <h1>Your sign-in works. This account still needs a hotel role.</h1>
        <p>Ask a group administrator to assign this account to Hotel Teesta as reception, property manager, or group administrator.</p>
        <form action={signOutStaff}><button className="button button-outline" type="submit">Sign out</button></form>
      </main>
    );
  }

  let propertyId = membership.property_id as string | null;
  if (!propertyId) {
    const { data: property } = await supabase.from("properties").select("id").order("created_at").limit(1).maybeSingle();
    propertyId = property?.id ?? null;
  }
  if (!propertyId) throw new Error("No property is available for this staff account.");

  const today = hotelDate();
  const [{ data: property }, { data: rooms }, { data: bookings }] = await Promise.all([
    supabase.from("properties").select("id, name, city").eq("id", propertyId).single(),
    supabase.from("rooms").select("id, room_number, status, room_housekeeping(status, updated_at)").eq("property_id", propertyId).order("room_number"),
    supabase.from("bookings").select("id, reference, status, check_in, check_out, guest_name, guest_phone_e164, total_paise, balance_paise").eq("property_id", propertyId).lte("check_in", today).gte("check_out", today).not("status", "in", "(cancelled,expired)").order("check_in"),
  ]);

  const todayBookings = bookings ?? [];
  const arrivals = todayBookings.filter((booking) => booking.check_in === today);
  const departures = todayBookings.filter((booking) => booking.check_out === today);
  const staying = todayBookings.filter((booking) => booking.status === "checked_in");
  const roomRows = (rooms ?? []).map((room) => {
    const housekeeping = Array.isArray(room.room_housekeeping) ? room.room_housekeeping[0] : room.room_housekeeping;
    return { ...room, housekeepingStatus: (housekeeping?.status ?? "unknown") as HousekeepingStatus };
  });
  const readyRooms = roomRows.filter((room) => room.housekeepingStatus === "clean").length;

  return (
    <main className="front-desk">
      <header className="front-desk-header">
        <Brand />
        <div><strong>{property?.name ?? "Hotel operations"}</strong><span>{readableDate(today)}</span></div>
        <form action={signOutStaff}><button type="submit" className="staff-icon-button"><LogOut size={17} /> Sign out</button></form>
      </header>

      <section className="front-desk-title">
        <p className="eyebrow">Live operations</p>
        <h1>Front desk</h1>
        <p>Arrivals, departures and room readiness in one working view.</p>
      </section>

      <section className="front-desk-metrics" aria-label="Today at a glance">
        <div><CalendarCheck2 /><span>Arrivals</span><strong>{arrivals.length}</strong></div>
        <div><UsersRound /><span>In house</span><strong>{staying.length}</strong></div>
        <div><BedDouble /><span>Departures</span><strong>{departures.length}</strong></div>
        <div><Sparkles /><span>Rooms ready</span><strong>{readyRooms}<small> / {roomRows.length}</small></strong></div>
      </section>

      <div className="front-desk-workspace">
        <section className="room-board" aria-labelledby="room-board-title">
          <div className="staff-section-heading"><div><p className="eyebrow">Housekeeping</p><h2 id="room-board-title">Room board</h2></div><span>{roomRows.length} rooms</span></div>
          {roomRows.length ? (
            <div className="room-board-table">
              <div className="room-board-head"><span>Room</span><span>Inventory</span><span>Housekeeping</span></div>
              {roomRows.map((room) => (
                <div className="room-board-row" key={room.id}>
                  <strong>{room.room_number}</strong>
                  <span className={`inventory-state inventory-${room.status}`}>{room.status}</span>
                  <form action={updateHousekeeping}>
                    <input type="hidden" name="roomId" value={room.id} />
                    <select name="status" defaultValue={room.housekeepingStatus} aria-label={`Housekeeping status for room ${room.room_number}`}>
                      <option value="unknown">Not set</option>
                      <option value="clean">Clean</option>
                      <option value="dirty">Dirty</option>
                      <option value="inspecting">Inspecting</option>
                      <option value="out_of_service">Out of service</option>
                    </select>
                    <button type="submit">Save</button>
                  </form>
                </div>
              ))}
            </div>
          ) : <p className="staff-empty">No rooms are assigned to this property yet.</p>}
        </section>

        <aside className="today-desk" aria-labelledby="today-desk-title">
          <div className="staff-section-heading"><div><p className="eyebrow">Guest movement</p><h2 id="today-desk-title">Today</h2></div></div>
          <div className="today-group"><h3>Arrivals <span>{arrivals.length}</span></h3>{arrivals.length ? arrivals.map((booking) => <div className="booking-line" key={booking.id}><strong>{booking.guest_name ?? "Guest details pending"}</strong><span>{booking.reference}</span></div>) : <p>No arrivals recorded.</p>}</div>
          <div className="today-group"><h3>Departures <span>{departures.length}</span></h3>{departures.length ? departures.map((booking) => <div className="booking-line" key={booking.id}><strong>{booking.guest_name ?? "Guest details pending"}</strong><span>{booking.reference}</span></div>) : <p>No departures recorded.</p>}</div>
          <div className="today-group"><h3>Needs attention</h3><p>{roomRows.filter((room) => room.housekeepingStatus === "dirty" || room.housekeepingStatus === "out_of_service").length} room exceptions · {todayBookings.filter((booking) => booking.balance_paise > 0).length} outstanding balances</p></div>
        </aside>
      </div>
    </main>
  );
}
