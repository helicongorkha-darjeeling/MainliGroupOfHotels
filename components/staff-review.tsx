"use client";
import { useEffect, useState } from "react";
import { Brand } from "./brand";
import { HotelOperations, type StaffOperationsView } from "./hotel-operations";
import { StaffAccounts } from "./staff-accounts";
import { StaffHousekeeping } from "./staff-housekeeping";
import { StaffWalkIn } from "./staff-walk-in";
import { StaffCheckIn } from "./staff-check-in";
import { StaffStay } from "./staff-stay";
import { StaffInvoice } from "./staff-invoice";
import { StaffRequestProvider, type StaffRequest } from "./staff-ui";
import { staffReviewData, reviewInvoice } from "@/lib/staff-review-data";
import { folioAmounts } from "@/lib/folio";
import { nightsBetween } from "@/lib/stay";
const screens = ["home", "arrivals", "in_house", "departures", "rooms", "walk-in", "check-in", "stay", "housekeeping", "team", "invoice", "settings"] as const;
const reviewRequest: StaffRequest = async <T,>(endpoint: string, input?: Record<string, unknown>): Promise<T> => {
  if (endpoint === "/api/staff/availability" && input) {
    const guests = Number(input.guests); const subtotal = (guests === 1 ? 200000 : guests === 2 ? 250000 : guests * 120000) * nightsBetween(String(input.checkIn), String(input.checkOut));
    const amount = folioAmounts(subtotal, 0, 0, 0, 500);
    return { data: { rooms: staffReviewData.rooms.filter(room => room.occupancy === "vacant" && room.housekeeping !== "out_of_service"), choices: staffReviewData.categories.map(category => ({ ...category, rooms: Math.ceil(guests / category.capacity), availableRooms: 4, bookable: true,
      quote: { subtotalPaise: subtotal, taxPaise: amount.taxPaise, totalPaise: amount.totalPaise, taxConfirmed: true, nights: nightsBetween(String(input.checkIn), String(input.checkOut)), nightlyPrices: [] } })) } } as T;
  }
  throw new Error("This is a local screen review. Saves, uploads, payments and messages are disabled.");
};
export function StaffScreenReview() {
  const [screen, setScreen] = useState<typeof screens[number]>("home");
  const [largeText, setLargeText] = useState(false);
  useEffect(() => {
    const previous = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = largeText ? "20px" : "";
    return () => { document.documentElement.style.fontSize = previous; };
  }, [largeText]);
  const home = () => setScreen("home");
  return <main className="staff-app staff-shell"><header className="staff-shell-header"><Brand/><h1>Staff app review</h1></header><div className="staff-shell-main">
    <p className="staff-notice">Local review · synthetic sample data. All saves and external actions are disabled. The sample tax and legal details are not hotel settings.</p>
    <label className="staff-review-control">Review screen<select aria-label="Review screen" value={screen} onChange={event => setScreen(event.target.value as typeof screen)}>{screens.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
    <label className="staff-review-control"><input type="checkbox" checked={largeText} onChange={event => setLargeText(event.target.checked)}/> Large text (125%)</label>
    <StaffRequestProvider request={reviewRequest}>
      {screen === "walk-in" ? <StaffWalkIn data={staffReviewData} onBack={home} onComplete={home}/> : screen === "check-in" ? <StaffCheckIn data={staffReviewData} reservation={staffReviewData.reservations[0]} onBack={home} onComplete={home}/> : screen === "stay" ? <StaffStay data={staffReviewData} reservation={staffReviewData.reservations[1]} onBack={home}/> : screen === "team" ? <StaffAccounts data={staffReviewData}/> : screen === "housekeeping" ? <StaffHousekeeping data={{role:"housekeeping",staffCoreReady:true,rooms:staffReviewData.rooms.map(({number,category,active,housekeeping,occupancy})=>({number,category,active,housekeeping,occupancy}))}}/> : screen === "invoice" ? <StaffInvoice invoice={reviewInvoice}/> : <HotelOperations key={screen} data={staffReviewData} initialView={screen as StaffOperationsView}/>}
    </StaffRequestProvider>
  </div></main>;
}
