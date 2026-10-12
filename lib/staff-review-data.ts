/** Synthetic fixtures for the development-only screen review. Never a staff session or live inventory. */
import { addHotelDays, hotelToday } from "./stay";
import { folioAmounts } from "./folio";
import type { HotelOperationsData, StaffInvoice, StaffFolio, StaffStay } from "./staff-types";
const today = hotelToday();
const tomorrow = addHotelDays(today, 1);
const yesterday = addHotelDays(today, -1);
const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"];
const categories = [
  { code: "double-room", name: "Double Room", capacity: 2, online_enabled: true },
  { code: "triple-room", name: "Triple Room", capacity: 3, online_enabled: true },
  { code: "four-person-room", name: "Four-person Room", capacity: 4, online_enabled: true },
  { code: "six-person-room", name: "Six-person Room", capacity: 6, online_enabled: true },
];
const roomCategories = ["double-room", "double-room", "double-room", "double-room", "double-room", "triple-room", "four-person-room", "four-person-room", "four-person-room", "double-room", "double-room", "double-room", "double-room", "double-room", "four-person-room", "four-person-room", "four-person-room", "triple-room", "double-room", "double-room", "double-room", "double-room", "triple-room", "six-person-room", "triple-room"];
const reservations = ids.map((id, index) => ({
  id, reference: `SAMPLE-REVIEW-${index + 1}`, user_id: null, category: "double-room", check_in: index === 0 ? today : yesterday,
  check_out: index === 2 ? today : tomorrow, guests: 2, rooms: 1, full_name: ["Example arriving guest", "Example in-house guest", "Example departing guest"][index],
  email: "guest@example.invalid", phone: "+919000000001", status: index === 0 ? "confirmed" : "checked_in", hold_until: null,
  total_paise: 262500, subtotal_paise: 250000, tax_paise: 12500, paid_paise: index === 0 ? 0 : 100000, order_id: null, payment_id: null,
  created_at: `${yesterday}T06:00:00Z`,
}));
const stays: StaffStay[] = reservations.map((booking, index) => ({
  reservation_id: booking.id, source: index === 2 ? "booking_com" : "direct_website", source_other: null, ota_reference: index === 2 ? "SAMPLE-OTA-001" : null,
  address: "Sample guest address — local review only", nationality: "Indian", adults: 2, children: 0, id_type: index === 0 ? null : "aadhaar",
  id_number: index === 0 ? null : "•••• •••• 1234", passport_number: null, visa_number: null, visa_expiry: null,
  checked_in_at: index === 0 ? null : `${yesterday}T08:45:00Z`, checked_in_by: index === 0 ? null : ids[0], expected_check_out: booking.check_out,
  checked_out_at: null, checked_out_by: null, allow_balance_due: false, allow_balance_by: null,
  id_front_path: null, id_back_path: null,
}));
const folios: StaffFolio[] = reservations.map(booking => {
  const amount = folioAmounts(booking.subtotal_paise, 30000, 0, booking.paid_paise, 500);
  return { reservation_id: booking.id, room_subtotal_paise: booking.subtotal_paise, extras_paise: 30000, discount_paise: 0, taxable_paise: amount.taxablePaise,
    tax_rate_bps: 500, tax_paise: amount.taxPaise, total_paise: amount.totalPaise, paid_paise: amount.paidPaise, balance_paise: amount.balancePaise, tax_confirmed: amount.taxConfirmed };
});
export const reviewInvoice: StaffInvoice = {
  id: "44444444-4444-4444-8444-444444444444", reservation_id: ids[2], number: "MH/2026-27/0001", financial_year: "2026-27", sequence: 1,
  issued_at: `${today}T05:00:00Z`, issued_by: ids[0], share_enabled: false,
  snapshot: { legal_name: "Sample hotel name — review only", legal_address: "Sample legal address — owner to supply", gstin: null,
    guest_name: reservations[2].full_name, address: stays[2].address!, check_in: yesterday, check_out: today, rooms: ["303"], folio: folios[2],
    items: [{ kind: "charge", description: "Sample laundry charge", amount_paise: 30000 }],
    nightly_prices: [{ date: yesterday, amountPaise: 250000, rateName: "Sample saved rate" }],
  },
};
export const staffReviewData: HotelOperationsData = {
  role: "manager", staffCoreReady: true, emailReady: false, paymentReady: false, schedulerReady: false, categories,
  rooms: roomCategories.map((category, index) => ({ number: String(301 + index), category, active: true,
    housekeeping: index === 0 || index === 5 ? "dirty" : index === 24 ? "out_of_service" : "clean",
    occupancy: index === 1 ? "occupied" : index === 2 ? "departing_today" : index === 3 ? "arriving_today" : "vacant",
    reservation_id: index === 1 ? ids[1] : index === 2 ? ids[2] : index === 3 ? ids[0] : null,
    checked_in_at: index === 1 || index === 2 ? `${yesterday}T08:45:00Z` : null,
    expected_check_out: index === 2 ? today : index === 1 || index === 3 ? tomorrow : null,
    source: index === 2 ? "booking_com" : index === 1 || index === 3 ? "direct_website" : null,
  })), reservations, assignments: [{ reservation_id: ids[0], room_number: "304" }, { reservation_id: ids[1], room_number: "302" }, { reservation_id: ids[2], room_number: "303" }],
  seasons: [], settings: { tax_rate_bps: 500, payments_enabled: false, check_in_time: "14:00", check_out_time: "11:00", cancellation_terms: "Sample terms for local screen review only.", legal_name: "Sample hotel name", legal_address: "Sample legal address", gstin: null },
  stays, folios, invoices: [], folioItems: [{ id: "sample-item", reservation_id: ids[1], kind: "charge", description: "Sample laundry charge", amount_paise: 30000, tax_rate_bps: 500, created_by: ids[0], created_at: `${today}T03:00:00Z` }],
  folioPayments: [], balanceRequests: [], staffMembers: [
    { user_id: ids[0], name: "Example manager", username: "sample_manager", role: "manager", active: true },
    { user_id: ids[1], name: "Example front desk", username: "sample_reception", role: "reception", active: true },
    { user_id: ids[2], name: "Example housekeeper", username: "sample_housekeeper", role: "housekeeping", active: true },
  ],
};
